import { supabase } from "../config/supabase.js";

export const checkPermission = async (
  fileId,
  userId,
  requiredPermission = "view",
) => {
  // 1. Check if User is the Owner
  const { data: file } = await supabase
    .from("files")
    .select("owner_id")
    .eq("id", fileId)
    .single();

  if (file && file.owner_id === userId) return true; // Owner has all permissions

  // 2. Check if File is Shared with this User
  const { data: share } = await supabase
    .from("file_shares")
    .select("permission")
    .eq("file_id", fileId)
    .eq(
      "shared_with_email",
      (
        await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single()
      ).data?.email,
    )
    .single();

  if (!share) return false; // Not shared

  if (requiredPermission === "edit" && share.permission !== "edit")
    return false;

  return true;
};
