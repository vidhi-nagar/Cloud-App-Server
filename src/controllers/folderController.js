import { sendShareEmail } from "../utils/sendEmail.js";
import { supabase } from "../config/supabase.js";
import { checkPermission } from "../utils/checkPermission.js";

// 1. Create Folder
// 1. Create Folder (Updated with Unique Storage Key)
export const createFolder = async (req, res) => {
  try {
    const { name, parent_id = null } = req.body;
    const userId = req.user.id;

    if (!name)
      return res.status(400).json({ error: "Folder name is required" });

    let duplicateQuery = supabase
      .from("files")
      .select("id")
      .eq("owner_id", userId)
      .eq("name", name.trim())
      .eq("is_folder", true)
      .eq("is_deleted", false);

    if (parent_id === null || parent_id === undefined || parent_id === "") {
      duplicateQuery = duplicateQuery.is("parent_id", null);
    } else {
      duplicateQuery = duplicateQuery.eq("parent_id", parent_id);
    }

    const { data: existing } = await duplicateQuery.maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: `"${name}" naam ka folder pehle se exist karta hai!`,
      });
    }
    // 🔥 FIX: Ek unique storage_key generate karein taaki database error na de
    const uniqueKey = `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const { data, error } = await supabase
      .from("files")
      .insert([
        {
          name,
          owner_id: userId,
          parent_id: parent_id,
          is_folder: true,
          mime_type: "folder",
          storage_key: uniqueKey, // <--- Ye line add karni hai
        },
      ])
      .select();

    if (error) throw error;

    res
      .status(201)
      .json({ message: "Folder created successfully", folder: data[0] });
  } catch (err) {
    // Agar constraint error aaye toh specific message dikhayein
    res.status(500).json({ error: err.message });
  }
};

// 2. Rename File or Folder
export const renameItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName, parent_id } = req.body;
    const userId = req.user.id;

    // Duplicate name check
    if (newName) {
      // Pehle current item ki info lo
      const { data: currentItem } = await supabase
        .from("files")
        .select("parent_id, is_folder")
        .eq("id", id)
        .single();

      let duplicateQuery = supabase
        .from("files")
        .select("id")
        .eq("owner_id", userId)
        .eq("name", newName.trim())
        .eq("is_deleted", false)
        .neq("id", id);

      // Same folder mein same naam ka koi aur item check karo

      if (
        currentItem.parent_id === null ||
        currentItem.parent_id === undefined
      ) {
        duplicateQuery = duplicateQuery.is("parent_id", null);
      } else {
        duplicateQuery = duplicateQuery.eq("parent_id", currentItem.parent_id);
      }

      const { data: existing } = await duplicateQuery.maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: `"${newName}" naam pehle se exist karta hai is folder mein!`,
        });
      }
    }

    const updateData = {};
    if (newName !== undefined) updateData.name = newName.trim();
    if (parent_id !== undefined) updateData.parent_id = parent_id || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const { data, error } = await supabase
      .from("files")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0)
      return res.status(404).json({ error: "Item not found" });

    res.status(200).json({ message: "Updated successfully", item: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const moveToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const hasAccess = await checkPermission(id, userId, "edit");
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "You don't have permission to edit this item" });
    }

    const { data, error } = await supabase
      .from("files")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0)
      return res.status(404).json({ error: "Item not found" });

    res
      .status(200)
      .json({ message: "Moved to Trash successfully", item: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trash mein maujood files ki list lena
export const getTrashItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", true) // Sirf delete ki huyi files
      .order("deleted_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ trash: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trash se file wapas nikalna (Restore)
export const restoreItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("files")
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq("id", id)
      .eq("owner_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0)
      return res.status(404).json({ error: "Item not found" });

    res
      .status(200)
      .json({ message: "Item restored successfully", item: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// File ya Folder ko share karne ki API
export const shareItem = async (req, res) => {
  try {
    const { file_id, email, permission = "view" } = req.body;
    const ownerId = req.user.id;

    // 1. Check karein ki kya file exists karti hai aur owner wahi hai
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .select("id,name")
      .eq("id", file_id)
      .eq("owner_id", ownerId)
      .single();

    if (fileError || !fileData) {
      return res
        .status(404)
        .json({ error: "File not found or you don't have permission" });
    }

    // 2. Share record insert karein
    const { data, error } = await supabase
      .from("file_shares")
      .insert([
        {
          file_id,
          shared_by: ownerId,
          shared_with_email: email,
          permission,
        },
      ])
      .select();

    if (error) throw error;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    console.log("Mera Backend URL hai:", process.env.BACKEND_URL);

    // 3. Unique link generate karein
    const shareLink = `${backendUrl}/api/files/shared/${data[0].share_link_id}`;

    // 4. Email Send
    try {
      await sendShareEmail({
        toEmail: email,
        sharedByEmail: req.user.email,
        fileName: fileData.name,
        shareLink,
        permission,
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError.message);
      // Email fail ho toh bhi share success return karo
    }

    res.status(201).json({
      message: "Item shared successfully",
      share_info: data[0],
      link: shareLink,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Secure Signed URL generate karne ka function
export const getSecureLink = async (req, res) => {
  try {
    const { file_id } = req.params;
    const userId = req.user.id;

    console.log("Debug: Fetching file with ID:", file_id);
    console.log("Debug: Requested by User:", userId);

    // 1. Pehle database se storage_key aur name nikalein
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("storage_key, name, is_folder, owner_id")
      .eq("id", file_id)
      .eq("owner_id", userId)
      .single();

    if (fileError || !file) {
      console.log("Supabase Error:", fileError);
      return res.status(404).json({ error: "File not found" });
    }

    if (file.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this file" });
    }

    // 2. Folder ke liye signed URL nahi ban sakta (sirf files ke liye)
    if (file.is_folder) {
      return res
        .status(400)
        .json({ error: "Cannot generate signed URL for a folder" });
    }

    // 3. Supabase Storage se Signed URL banayein (Expire in 60 minutes)
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(file.storage_key, 3600); // 3600 sec = 1 Hour

    if (error) throw error;

    res.status(200).json({
      message: "Secure temporary link generated",
      signedUrl: data.signedUrl,
      expires_in: "1 hour",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// src/controllers/fileController.js
export const getSharedItemByLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    const { data, error } = await supabase
      .from("file_shares")
      .select("file_id, permission, files(*)")
      .eq("share_link_id", linkId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Link invalid or expired" });

    res.status(200).json({
      item: data.files,
      permission: data.permission,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
