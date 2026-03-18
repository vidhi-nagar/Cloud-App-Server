import { supabase } from "../config/supabase.js";

export const checkPermission = async (
  fileId,
  userId,
  requiredPermission = "view",
) => {
  try {
    // 1. Check if User is the Owner
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("owner_id")
      .eq("id", fileId)
      .single();

    if (fileError || !file) return false;
    if (file.owner_id === userId) return true; // Owner has all permissions

    // 2. Pehle user ki email nikaalein (Clean way)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return false;

    // 3. Check if File is Shared with this User
    // Hum .ilike use kar rahe hain taaki case-sensitivity (Capital/Small) ka issue na ho
    const { data: share, error: shareError } = await supabase
      .from("file_shares")
      .select("permission")
      .eq("file_id", fileId)
      .ilike("shared_with_email", profile.email)
      .single();

    if (shareError || !share) return false; // Not shared

    // 4. Permission Logic
    if (requiredPermission === "edit") {
      return share.permission === "edit"; // Sirf 'edit' hone par hi true dega
    }

    return true; // 'view' permission is enough for view requests
  } catch (err) {
    console.error("Permission Check Error:", err);
    return false;
  }
};
