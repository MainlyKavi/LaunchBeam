import {
  apiError,
  apiJson,
  isUuid,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { projectContentSchema } from "@/lib/validation/project";

const ASSET_BUCKET = "project-assets";
const MAXIMUM_ASSET_BYTES = 5 * 1024 * 1024;
const MAXIMUM_MULTIPART_BYTES = MAXIMUM_ASSET_BYTES + 64 * 1024;
const MAXIMUM_DELETE_BODY_BYTES = 2 * 1024;
const SIGNED_URL_LIFETIME_SECONDS = 24 * 60 * 60;

const ASSET_KINDS = ["logo", "hero", "background", "screenshot"] as const;
type AssetKind = (typeof ASSET_KINDS)[number];

const EXTENSIONS_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

type AllowedMime = keyof typeof EXTENSIONS_BY_MIME;

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function isAssetKind(value: string): value is AssetKind {
  return ASSET_KINDS.some((kind) => kind === value);
}

function isAllowedMime(value: string): value is AllowedMime {
  return Object.prototype.hasOwnProperty.call(EXTENSIONS_BY_MIME, value);
}

function bytesEqual(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasValidImageSignature(mime: AllowedMime, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") {
    return bytesEqual(bytes, 0, [0xff, 0xd8, 0xff]);
  }
  if (mime === "image/png") {
    return bytesEqual(bytes, 0, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }
  if (mime === "image/webp") {
    return (
      bytesEqual(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
      bytesEqual(bytes, 8, [0x57, 0x45, 0x42, 0x50])
    );
  }

  const header = new TextDecoder("ascii").decode(bytes.slice(0, 32));
  return (
    header.slice(4, 8) === "ftyp" &&
    /(?:avif|avis|mif1|msf1)/.test(header.slice(8))
  );
}

function pathFromSignedAssetUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/sign/${ASSET_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function authenticatedOwner(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      supabase,
      user: null,
      project: null,
      ownsProject: false,
      ownershipError: null,
    };
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id,content")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    project: data,
    ownsProject: !error && data !== null,
    ownershipError: error,
  };
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const contentLengthHeader = request.headers.get("content-length");
    if (!contentLengthHeader) {
      return apiError(
        "content_length_required",
        "The upload size could not be verified. Choose the image again.",
        411,
      );
    }
    const contentLength = Number(contentLengthHeader);
    if (
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > MAXIMUM_MULTIPART_BYTES
    ) {
      return apiError(
        "asset_too_large",
        "Images must be no larger than 5 MB.",
        413,
      );
    }

    const { supabase, user, ownsProject, ownershipError } =
      await authenticatedOwner(projectId);
    if (!user) {
      return apiError(
        "authentication_required",
        "Sign in to upload project images.",
        401,
      );
    }
    if (ownershipError) {
      return apiError(
        "asset_upload_failed",
        "The image could not be uploaded.",
        500,
      );
    }
    if (!ownsProject) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError(
        "invalid_asset_request",
        "Send one image using multipart form data.",
        400,
      );
    }

    const file = formData.get("file");
    const kindValue = formData.get("kind") ?? formData.get("field");
    if (!(file instanceof File) || typeof kindValue !== "string") {
      return apiError(
        "invalid_asset_request",
        "Choose an image and where it will be used.",
        400,
      );
    }
    if (!isAssetKind(kindValue)) {
      return apiError(
        "invalid_asset_kind",
        "Choose a supported project image type.",
        400,
      );
    }
    if (!isAllowedMime(file.type)) {
      return apiError(
        "invalid_asset_type",
        "Upload a JPEG, PNG, WebP, or AVIF image.",
        415,
      );
    }
    if (file.size === 0 || file.size > MAXIMUM_ASSET_BYTES) {
      return apiError(
        "asset_too_large",
        "Images must be non-empty and no larger than 5 MB.",
        413,
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidImageSignature(file.type, bytes)) {
      return apiError(
        "invalid_asset_type",
        "The uploaded file does not match its image type.",
        415,
      );
    }

    const extension = EXTENSIONS_BY_MIME[file.type];
    const path = `${user.id}/${projectId}/${kindValue}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(path, bytes, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return apiError(
        "asset_upload_failed",
        "The image could not be uploaded. Please try again.",
        500,
      );
    }

    const { data: signedAsset, error: signedUrlError } = await supabase.storage
      .from(ASSET_BUCKET)
      .createSignedUrl(path, SIGNED_URL_LIFETIME_SECONDS);

    if (signedUrlError || !signedAsset) {
      await supabase.storage.from(ASSET_BUCKET).remove([path]);
      return apiError(
        "asset_upload_failed",
        "The image could not be prepared for use.",
        500,
      );
    }

    return apiJson(
      {
        url: signedAsset.signedUrl,
        asset: {
          kind: kindValue,
          path,
          signedUrl: signedAsset.signedUrl,
        },
      },
      201,
    );
  } catch {
    return apiError(
      "service_unavailable",
      "Image uploads are temporarily unavailable.",
      503,
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const { supabase, user, project, ownsProject, ownershipError } =
      await authenticatedOwner(projectId);
    if (!user) {
      return apiError(
        "authentication_required",
        "Sign in to remove project images.",
        401,
      );
    }
    if (ownershipError) {
      return apiError(
        "asset_delete_failed",
        "The image could not be removed.",
        500,
      );
    }
    if (!ownsProject) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const payload = await readJsonBody(request, MAXIMUM_DELETE_BODY_BYTES);
    if (!payload || typeof payload !== "object") {
      return apiError(
        "invalid_asset_path",
        "Choose a project image to remove.",
        400,
      );
    }

    const requestedPath =
      "path" in payload && typeof payload.path === "string"
        ? payload.path
        : "url" in payload && typeof payload.url === "string"
          ? pathFromSignedAssetUrl(payload.url)
          : null;

    if (!requestedPath) {
      return apiError(
        "invalid_asset_path",
        "Choose a project image to remove.",
        400,
      );
    }

    const escapedUserId = user.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedProjectId = projectId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ownedPathPattern = new RegExp(
      `^${escapedUserId}/${escapedProjectId}/(?:${ASSET_KINDS.join("|")})-[0-9a-f-]{36}\\.(?:jpg|png|webp|avif)$`,
      "i",
    );

    if (
      requestedPath.includes("..") ||
      requestedPath.includes("\\") ||
      !ownedPathPattern.test(requestedPath)
    ) {
      return apiError(
        "invalid_asset_path",
        "That image path is not part of this project.",
        400,
      );
    }

    const content = projectContentSchema.safeParse(project?.content);
    if (content.success) {
      const referencedPaths = [
        pathFromSignedAssetUrl(content.data.logoUrl ?? ""),
        pathFromSignedAssetUrl(content.data.heroImageUrl ?? ""),
        pathFromSignedAssetUrl(content.data.screenshotUrl ?? ""),
        pathFromSignedAssetUrl(content.data.backgroundImageUrl ?? ""),
      ];
      if (referencedPaths.includes(requestedPath)) {
        return apiError(
          "asset_still_in_use",
          "Save the project without this image before removing it.",
          409,
        );
      }
    }

    const { error } = await supabase.storage
      .from(ASSET_BUCKET)
      .remove([requestedPath]);
    if (error) {
      return apiError(
        "asset_delete_failed",
        "The image could not be removed. Please try again.",
        500,
      );
    }

    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return (
      requestErrorResponse(error) ??
      apiError(
        "service_unavailable",
        "Image removal is temporarily unavailable.",
        503,
      )
    );
  }
}
