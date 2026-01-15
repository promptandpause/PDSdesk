import {
  FileText,
  Folder,
  Download,
  Upload,
  Search,
  Filter,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch supporting files from Supabase storage
export function SupportingFilesView() {
  type SupportingFileRow = {
    id: string;
    name: string;
    folder: string;
    size: string;
    uploadedBy: string;
    uploadedDate: string;
    type: string;
  };

  const files: SupportingFileRow[] = [];
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Supporting Files
        </h2>
        <button
          type="button"
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2"
          onClick={() => setMessage("Upload is not implemented yet.")}
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {message}
        </div>
      )}

      <div className="border-b border-gray-300 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-300 rounded">
          <option>All Folders</option>
          <option>Policies</option>
          <option>Contracts</option>
          <option>Documentation</option>
          <option>Procedures</option>
        </select>
        <button
          type="button"
          className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 flex items-center gap-2"
          onClick={() => setMessage("Filters are not implemented yet.")}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">
                File Name
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Folder
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Size
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Type
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Uploaded By
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Upload Date
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-sm text-gray-600">
                  No files found.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-gray-200 hover:bg-[#f9f9f9]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText
                        size={16}
                        className="text-blue-600"
                      />
                      <span className="font-medium">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Folder
                        size={14}
                        className="text-yellow-600"
                      />
                      {file.folder}
                    </div>
                  </td>
                  <td className="px-4 py-3">{file.size}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {file.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{file.uploadedBy}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {file.uploadedDate}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-[#4a9eff] hover:underline flex items-center gap-1"
                      onClick={() => setMessage("Download is not implemented yet.")}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}