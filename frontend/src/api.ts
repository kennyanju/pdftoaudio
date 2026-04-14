import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Make sure this matches your backend URL

export const api = axios.create({
  baseURL: API_URL,
});

export interface Job {
  id: string;
  filename: string;
  status: string;
  text_length: number;
  num_chunks: number;
  output_file: string | null;
  created_at: string;
}

export const uploadPdf = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const startConversion = async (jobId: string) => {
  const response = await api.post(`/convert/${jobId}`);
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<Job> => {
  const response = await api.get(`/status/${jobId}`);
  return response.data;
};

export const getHistory = async (): Promise<Job[]> => {
  const response = await api.get('/history');
  return response.data;
};

export const getDownloadUrl = (jobId: string) => {
  return `${API_URL}/download/${jobId}`;
};
