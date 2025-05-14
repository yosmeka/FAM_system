"use client";

import React, { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSession, signOut } from "next-auth/react";

import { NotificationBell } from "@/components/ui/NotificationBell";
import AccountInfoModal from "./AccountInfoModal";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    roles: [
      "ADMIN",
      "MANAGER",
    
    ],
  },
  {
    name: "Assets",
    href: "/assets",
    roles: [ "MANAGER", "USER", ],
  },
  {
    name: "Transfers",
    href: "/transfers",
    roles: ["MANAGER", "USER"],
  },
  {
    name: "Maintenance",
    href: "/maintenance",
    roles: ["MANAGER", "USER"],
  },
  {
    name: "Disposals",
    href: "/disposals",
    roles: ["MANAGER", "USER"],
  },
  {
    name: "Reports",
    href: "/reports",
    roles: ["MANAGER", "USER"],
  },
  { name: "Users", href: "/users", roles: ["ADMIN"] },
  { name: "Role & Permission Management", href: "/role-permission", roles: ["ADMIN"] },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  React.useEffect(() => {
    // Fetch notifications for all authenticated users
    fetch('/api/admin/notifications')
      .then(res => res.ok ? res.json() : { notifications: [] })
      .then(data => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));
  }, []);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showAccountInfo, setShowAccountInfo] = React.useState(false);

  if (!session) return null;

  const userRole = session.user?.role as string;
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <Disclosure as="nav" className="bg-red-600">
      {({ open }: { open: boolean }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <Link href="/dashboard" className="flex flex-shrink-0 items-center">
                  <span className="text-white text-xl font-bold">FAMS</span>
                </Link>
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {filteredNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          pathname === item.href
                            ? "bg-red-200 text-black"
                            : "text-gray-200 hover:bg-red-200 hover:text-gray-200",
                          "rounded-md px-3 py-2 text-sm font-medium"
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>

              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                {/* Theme Switcher */}

                {/* Notification Bell (right of navigation, left of profile) */}
                <NotificationBell notifications={notifications} setNotifications={setNotifications} />
                {/* Profile Dropdown */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="relative flex rounded-full bg-red-600 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600">
                      <span className="absolute -inset-1.5" />
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white">
                        {session.user?.name?.[0]?.toUpperCase()}
                      </div>
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-semibold text-gray-900 text-base">{session.user?.name}</div>
                        <div className="text-xs text-gray-500">{session.user?.email}</div>
                      </div>
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            className={classNames(
                              active ? "bg-gray-100" : "",
                              "block w-full px-4 py-2 text-left text-sm text-gray-700"
                            )}
                            onClick={() => setShowAccountInfo(true)}
                          >
                            Account Information
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <Link
                            href="/account-settings"
                            className={classNames(
                              active ? "bg-gray-100" : "",
                              "block w-full px-4 py-2 text-left text-sm text-gray-700"
                            )}
                          >
                            Account Settings
                          </Link>
                        )}
                      </Menu.Item>
                      <div className="border-t border-gray-100 my-1" />
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => signOut()}
                            className={classNames(
                              active ? "bg-gray-100" : "",
                              "block w-full px-4 py-2 text-left text-sm text-red-600 font-semibold"
                            )}
                          >
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    pathname === item.href
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "block rounded-md px-3 py-2 text-base font-medium"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
