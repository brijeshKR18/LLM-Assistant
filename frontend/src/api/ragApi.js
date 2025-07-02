import axios from "axios";

export const submitQuery = async (query, model, file) => {
  const formData = new FormData();
  formData.append("query", query);
  formData.append("model", model);
  if (file) formData.append("file", file);

  const response = await axios.post("http://localhost:8000/query", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
