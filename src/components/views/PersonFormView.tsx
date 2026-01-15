import { useState } from "react";
import { User as UserIcon, Save } from "lucide-react";

interface PersonFormViewProps {
  personId?: string;
  isNewPerson?: boolean;
}

// TODO: Save person data to Supabase
export function PersonFormView({
  personId,
  isNewPerson = true,
}: PersonFormViewProps) {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "GENERAL" },
    { id: "information", label: "INFORMATION" },
    { id: "private", label: "PRIVATE" },
    { id: "contract", label: "CONTRACT" },
    { id: "graphic-overview", label: "GRAPHIC OVERVIEW" },
    { id: "person-group", label: "PERSON GROUP" },
    { id: "assets", label: "ASSETS" },
    { id: "objects", label: "OBJECTS" },
    { id: "images", label: "IMAGES" },
    { id: "links", label: "LINKS" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Person
          </span>
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            {isNewPerson ? "New person" : "Edit person"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2">
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 flex items-center gap-1 px-4 bg-white flex-shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-[#4a9eff] border-b-2 border-[#4a9eff]"
                : "text-gray-600 hover:text-[#2d3e50]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl">
          <div className="flex gap-6">
            {/* Form Fields */}
            <div className="flex-1">
              {/* General Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#2d3e50] mb-4">
                  General
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Surname
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      First Name(s)
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      First Initial(s)
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Prefixes
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Birth Name
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Title
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Gender
                    </label>
                    <select className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]">
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Language
                    </label>
                    <select className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]">
                      <option>English</option>
                      <option>Dutch</option>
                      <option>German</option>
                      <option>French</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Job application origin
                    </label>
                    <select className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]">
                      <option value="">Select...</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Job application status
                    </label>
                    <select className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]">
                      <option value="">Select...</option>
                      <option value="applied">Applied</option>
                      <option value="interviewing">
                        Interviewing
                      </option>
                      <option value="offer">
                        Offer Extended
                      </option>
                      <option value="hired">Hired</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#2d3e50] mb-4">
                  Contact Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Telephone
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Fax Number
                    </label>
                    <input
                      type="text"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <label className="text-sm text-[#4a9eff]">
                      Email
                    </label>
                    <input
                      type="email"
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="w-48 flex-shrink-0">
              <div className="sticky top-0">
                <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                  <UserIcon
                    size={64}
                    className="text-gray-400"
                  />
                </div>
                <button className="w-full mt-3 px-3 py-2 text-sm text-[#4a9eff] border border-[#4a9eff] rounded hover:bg-[#f0f8ff] transition-colors">
                  Upload Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}