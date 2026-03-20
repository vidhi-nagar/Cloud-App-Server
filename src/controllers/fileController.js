import { supabase } from "../config/supabase.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id;

    const parent_id = req.body.parent_id || null;

    if (!file) {
      return res.status(400).json({ error: "Please upload a file" });
    }

    // Unique path for storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `${userId}/${fileName}`;

    // 1. Supabase Storage Upload
    const { data: storageData, error: storageError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (storageError) throw storageError;

    // 2. Public URL nikalna
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    // 3. Database Entry (Exact Column Names matching your DB)
    const { data: dbData, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size, // Match: size_byte
          storage_key: filePath, // Match: storage_key
          owner_id: userId, // Match: owner_id
          file_url: urlData.publicUrl, // Match: file_url
          parent_id: parent_id || null, // 🔥 YEH LINE ADD KARNI HAI
        },
      ])
      .select();

    if (dbError) throw dbError;

    res.status(201).json({
      message: "File uploaded successfully!",
      file: dbData[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Sabhi files ki list lene ke liye
export const getUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId) // Sirf usi user ki files fetch karega jo logged in hai
      .order("created_at", { ascending: false }); // Latest files pehle dikhayega

    if (error) throw error;

    res.status(200).json({ files: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// File delete karne ke liye
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params; // URL se file ID milegi
    const userId = req.user.id;

    // 1. Pehle database se file ki info lo taaki storage_key mil sake
    const { data: fileData, error: findError } = await supabase
      .from("files")
      .select("storage_key")
      .eq("id", id)
      .eq("owner_id", userId) // Security: Sirf owner hi delete kar sake
      .single();

    if (findError || !fileData)
      return res.status(404).json({ error: "File not found" });

    // 2. Storage bucket se file delete karo
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([fileData.storage_key]);

    if (storageError) throw storageError;

    // 3. Database se record delete karo
    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    res.status(200).json({ message: "File deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSharedWithMe = async (req, res) => {
  try {
    // 1. User ki email lo (Make sure login user ki email fetch ho rahi hai)
    const userEmail = req.user.email;

    // 2. file_shares se data fetch karein
    const { data, error } = await supabase
      .from("file_shares")
      .select(
        `
        permission,
        file_id
      `,
      )
      .ilike("shared_with_email", userEmail); // Case-insensitive match

    if (error) throw error;
    if (!data || data.length === 0) {
      return res
        .status(200)
        .json({ sharedFiles: [], message: "No files shared with this email" });
    }

    // 3. In file_ids ka use karke 'files' table se actual data layein
    const fileIds = data.map((item) => item.file_id);

    const { data: sharedItems, error: fileError } = await supabase
      .from("files")
      .select("*")
      .in("id", fileIds); // Folder aur File dono 'files' table mein hain

    if (fileError) throw fileError;

    // 4. Permissions ko merge karke bhejte hain
    const finalResponse = sharedItems.map((item) => {
      const shareInfo = data.find((s) => s.file_id === item.id);
      return { ...item, permission: shareInfo.permission };
    });

    res.status(200).json({ sharedFiles: finalResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. Search API: Files aur Folders ko naam se dhoondna
export const searchFiles = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query)
      return res.status(400).json({ error: "Search query is required" });

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", false)
      .ilike("name", `%${query}%`); // Case-insensitive partial match

    if (error) throw error;
    res.status(200).json({ results: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Storage Stats API: Used space calculate karna
export const getStorageStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("files")
      .select("size_bytes")
      .eq("owner_id", userId)
      .eq("is_deleted", false);

    if (error) throw error;

    // Bytes ko sum karna
    const totalBytes = data.reduce(
      (acc, curr) => acc + (curr.size_bytes || 0),
      0,
    );

    // Bytes to MB conversion (1024 * 1024 = 1048576)
    const totalMB = (totalBytes / 1048576).toFixed(2);

    res.status(200).json({
      used_space_bytes: totalBytes,
      used_space_mb: `${totalMB} MB`,
      limit_mb: "500 MB",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: current } = await supabase
      .from("files")
      .select("is_starred")
      .eq("id", id)
      .eq("owner_id", userId)
      .single();

    const { data, error } = await supabase
      .from("files")
      .update({ is_starred: !current.is_starred })
      .eq("id", id)
      .eq("owner_id", userId)
      .select();

    if (error) throw error;
    res.status(200).json({ message: "Star updated", item: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Permanent Delete: DB aur Storage dono se hatana
export const permanentDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // A. Pehle check karein ki item exist karta hai
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("storage_key, is_folder")
      .eq("id", id)
      .eq("owner_id", userId)
      .single();

    if (fetchError || !file)
      return res.status(404).json({ error: "Item not found" });

    // B. Agar file hai, toh Supabase Storage se delete karein
    if (!file.is_folder && file.storage_key) {
      const { error: storageError } = await supabase.storage
        .from("uploads")
        .remove([file.storage_key]);

      if (storageError) throw storageError;
    }

    // C. Database se hamesha ke liye delete karein
    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    res
      .status(200)
      .json({ message: "Item permanently deleted from storage and database" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
