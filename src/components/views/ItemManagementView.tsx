import { Plus, Search, Filter, Package } from "lucide-react";

// TODO: Fetch items from Supabase
export function ItemManagementView() {
  const items = [
    {
      id: "IT-001",
      name: "USB-C Cable",
      category: "Accessories",
      stock: 45,
      minStock: 20,
      location: "Storage Room A",
      status: "In Stock",
      unitPrice: "£12.99",
    },
    {
      id: "IT-002",
      name: "Keyboard - Logitech K780",
      category: "Peripherals",
      stock: 8,
      minStock: 10,
      location: "Storage Room B",
      status: "Low Stock",
      unitPrice: "£79.99",
    },
    {
      id: "IT-003",
      name: 'Monitor 24" Dell',
      category: "Displays",
      stock: 0,
      minStock: 5,
      location: "Warehouse",
      status: "Out of Stock",
      unitPrice: "£249.99",
    },
    {
      id: "IT-004",
      name: "Toner Cartridge HP",
      category: "Supplies",
      stock: 32,
      minStock: 15,
      location: "Supply Closet",
      status: "In Stock",
      unitPrice: "£45.00",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Item Management
        </h2>
        <button className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1">
          <Plus size={14} />
          New Item
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-300 px-4 py-3 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>
          <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Item ID
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Name
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Category
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Stock
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Min. Stock
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Location
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Unit Price
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {item.id}
                </td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3 font-medium">
                  {item.stock}
                </td>
                <td className="px-4 py-3">{item.minStock}</td>
                <td className="px-4 py-3">{item.location}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === "In Stock"
                        ? "bg-green-100 text-green-800"
                        : item.status === "Low Stock"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {item.unitPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}