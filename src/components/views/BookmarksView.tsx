import {
  Star,
  Trash2,
  Plus,
  Folder,
  FileText,
  Users,
  Package,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch bookmarks from Supabase user preferences
export function BookmarksView() {
  const [bookmarks, setBookmarks] = useState([
    {
      id: "1",
      type: "incident",
      title: "I 2024 045 - Email server outage",
      url: "/call-management/I-2024-045",
      category: "Incidents",
      addedDate: "2024-01-10",
    },
    {
      id: "2",
      type: "person",
      title: "Alex Johnson - IT Services",
      url: "/person/alex-johnson",
      category: "People",
      addedDate: "2024-01-09",
    },
    {
      id: "3",
      type: "knowledge",
      title: "KB-045 - How to configure VPN",
      url: "/knowledge-base/kb-045",
      category: "Knowledge Base",
      addedDate: "2024-01-08",
    },
    {
      id: "4",
      type: "asset",
      title: "A-1245 - Dell Laptop (Marketing Team)",
      url: "/asset/A-1245",
      category: "Assets",
      addedDate: "2024-01-07",
    },
  ]);

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
    // TODO: Remove from Supabase
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "incident":
        return FileText;
      case "person":
        return Users;
      case "knowledge":
        return Folder;
      case "asset":
        return Package;
      default:
        return Star;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star
            size={20}
            className="text-yellow-600"
            fill="#ca8a04"
          />
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            My Bookmarks
          </h2>
          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
            {bookmarks.length} items
          </span>
        </div>
        <button className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2">
          <Plus size={16} />
          Add Bookmark
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <span className="text-sm text-blue-900">
          Bookmark important items for quick access. Click the
          star icon on any page to add it to your bookmarks.
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Star size={48} className="mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              No bookmarks yet
            </p>
            <p className="text-sm">
              Start bookmarking items to access them quickly
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {bookmarks.map((bookmark) => {
              const Icon = getIcon(bookmark.type);
              return (
                <div
                  key={bookmark.id}
                  className="bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        <Icon
                          size={18}
                          className="text-[#4a9eff]"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-[#2d3e50] mb-1 group-hover:text-[#4a9eff]">
                          {bookmark.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Folder size={12} />
                            {bookmark.category}
                          </span>
                          <span>
                            Added: {bookmark.addedDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-600 hover:text-yellow-700">
                        <Star size={16} fill="#ca8a04" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(bookmark.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category Groups */}
        {bookmarks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[#2d3e50] mb-4">
              Bookmarks by Category
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                "Incidents",
                "People",
                "Knowledge Base",
                "Assets",
              ].map((category) => {
                const count = bookmarks.filter(
                  (b) => b.category === category,
                ).length;
                return (
                  <div
                    key={category}
                    className="bg-white border border-gray-300 rounded p-3"
                  >
                    <div className="text-sm font-medium text-[#2d3e50] mb-1">
                      {category}
                    </div>
                    <div className="text-2xl font-bold text-[#4a9eff]">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}