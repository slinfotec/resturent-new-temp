"use client";
import { useState } from "react";
import { Sun, Moon, Bell, Menu, LogIn, LogOut, Home, Grid, Wand2, Filter, Upload, Flag, Award, Settings, Layers } from "lucide-react";
import Image from "next/image";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SideBar() {
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const pathname = usePathname();
  return (
    <div className={dark ? "dark" : ""}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 shadow flex items-center justify-between px-6 py-3 z-50">
        <div className="flex items-center gap-3 text-blue-600 font-semibold">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-200" />
          </button>
          <Image src="/logo.png" width={32} height={32} alt="logo" className="rounded-full" />
          <span className="hidden sm:block">CodingNepal</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <input
            type="text"
            placeholder="Search"
            className="w-full rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:bg-gray-900 dark:text-gray-200"
          />
        </div>

        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-200 cursor-pointer" />
          <button onClick={() => setDark(!dark)}>
            {dark ? <Moon className="w-5 h-5 text-gray-200" /> : <Sun className="w-5 h-5 text-gray-600" />}
          </button>
          <Image src="/profile.jpg" width={32} height={32} alt="profile" className="rounded-full" />
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-lg pt-20 transition-all duration-300 overflow-y-auto z-40 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <ul className="space-y-2 px-3">
          {/* Dashboard Menu */}
          <li>
            <button
              onClick={() => setActiveMenu(activeMenu === "home" ? null : "home")}
              className="flex items-center w-full px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white text-gray-600 dark:text-gray-200"
            >
              <Home className="w-5 h-5 mr-3" />
              {sidebarOpen && <span>Home</span>}
            </button>
            {activeMenu === "home" && sidebarOpen && (
              <ul className="ml-8 mt-1 space-y-1">
                {["Sub Link 1", "Sub Link 2", "Sub Link 3"].map((txt) => (
                  <li key={txt}>
                    <a href="#" className="block px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700">
                      {txt}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* Overview Menu */}
          <li>
            <button
              onClick={() => setActiveMenu(activeMenu === "overview" ? null : "overview")}
              className="flex items-center w-full px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white text-gray-600 dark:text-gray-200"
            >
              <Grid className="w-5 h-5 mr-3" />
              {sidebarOpen && <span>Overview</span>}
            </button>
            {activeMenu === "overview" && sidebarOpen && (
              <ul className="ml-8 mt-1 space-y-1">
                {["Sub Link A", "Sub Link B", "Sub Link C"].map((txt) => (
                  <li key={txt}>
                    <a href="#" className="block px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700">
                      {txt}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>

                 <li>
            <Link
              href="/item_details"
              className={`flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white ${
                pathname === "/item_details"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-200"
              }`}
            >
              <Wand2 className="w-5 h-5 mr-3" />{" "}
              {sidebarOpen && "Stock manage"}
            </Link>
          </li>

          {/* Editor Section */}
          <p className="mt-4 mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Editor
          </p>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Wand2 className="w-5 h-5 mr-3" /> {sidebarOpen && "Stock manage"}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Filter className="w-5 h-5 mr-3" /> {sidebarOpen && "Filters"}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Upload className="w-5 h-5 mr-3" /> {sidebarOpen && "Upload"}
            </a>
          </li>

          {/* Settings Section */}
          <p className="mt-4 mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Settings
          </p>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Flag className="w-5 h-5 mr-3" /> {sidebarOpen && "Notice Board"}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Award className="w-5 h-5 mr-3" /> {sidebarOpen && "Award"}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Settings className="w-5 h-5 mr-3" /> {sidebarOpen && "Setting"}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-3 py-2 rounded-md hover:bg-blue-500 hover:text-white">
              <Layers className="w-5 h-5 mr-3" /> {sidebarOpen && "Features"}
            </a>
          </li>
        </ul>

        {/* Expand/Collapse */}
        <div className="absolute bottom-10 left-0 w-full">
          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-between w-full px-4 py-2 text-gray-600 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700"
            >
              <span>Collapse</span>
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-full px-4 py-2 text-gray-600 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

    </div>
  );
}
