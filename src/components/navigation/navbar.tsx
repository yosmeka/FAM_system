"use client";

import React from "react";
import { Disclosure, Menu } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import { NotificationBell } from "@/components/ui/NotificationBell";
// import AccountInfoModal from "./AccountInfoModal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Notification } from "@/types/notification";

const navigation = [
	{
		name: "Dashboard",
		href: "/dashboard",
		roles: ["ADMIN", "MANAGER"],
	},
	{
		name: "Assets",
		href: "/assets",
		roles: ["MANAGER", "USER"],
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
		name: "Audits",
		href: "/audits/workflow",
		roles: ["MANAGER", "USER"],
	},
	{
		name: "Audit Review",
		href: "/audits/review",
		roles: ["MANAGER"],
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
	{
		name: "Role & Permission Management",
		href: "/role-permission",
		roles: ["ADMIN"],
	},
];

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
	const [notifications, setNotifications] = React.useState<Notification[]>([]);

	// Function to fetch notifications
	const fetchNotifications = React.useCallback(() => {
		// Fetch notifications for the current user only
		fetch("/api/admin/notifications")
			.then((res) => (res.ok ? res.json() : { notifications: [] }))
			.then((data) => {
				// Convert date strings to Date objects
				const notifs = (data.notifications || []).map((n: Partial<Notification>) => ({
					...n,
					createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
					updatedAt: n.updatedAt ? new Date(n.updatedAt) : n.createdAt ? new Date(n.createdAt) : new Date(),
				}));
				setNotifications(notifs);
			})
			.catch((error) => {
				console.error("Failed to fetch notifications:", error);
				setNotifications([]);
			});
	}, []);

	// Fetch notifications on component mount and every 30 seconds
	React.useEffect(() => {
		fetchNotifications();

		// Set up interval to refresh notifications
		const interval = setInterval(fetchNotifications, 30000);

		// Clean up interval on unmount
		return () => clearInterval(interval);
	}, [fetchNotifications]);
	const { data: session } = useSession();
	const pathname = usePathname();
	// const [showAccountInfo, setShowAccountInfo] = React.useState(false);

	if (!session) return null;
	const userRole = session.user?.role as string;
	const filteredNavigation = navigation.filter((item) => item.roles.includes(userRole));

	return (
		<Disclosure as="nav" className="bg-gradient-to-r from-gray-800 via-gray-900 to-black fixed top-0 left-0 w-full z-50 shadow-2xl border-b border-gray-700">
			{({ open }: { open: boolean }) => (
				<div>
					<div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
						<div className="relative flex h-16 items-center justify-between">
							<div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
								<Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 transition-all duration-300 ease-in-out transform hover:scale-110">
									<span className="absolute -inset-0.5" />
									<span className="sr-only">Open main menu</span>
									{open ? (
										<XMarkIcon className="block h-7 w-7" aria-hidden="true" />
									) : (
										<Bars3Icon className="block h-7 w-7" aria-hidden="true" />
									)}
								</Disclosure.Button>
							</div>
							<div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
								<Link href="/dashboard" className="flex flex-shrink-0 items-center gap-3 group">
									<span className="flex items-center transform group-hover:scale-105 transition-transform duration-300">
										<Image
											src="/images/zemen logo.png"
											alt="Zemen Bank Logo"
											width={44}
											height={44}
											priority
											className="h-[44px] w-auto object-contain rounded-sm"
											style={{ marginRight: 20 }}
										/>
									</span>
									<span className="text-red-400 text-2xl font-bold tracking-wider group-hover:text-sky-200 transition-colors duration-300 ease-in-out">
										FAMS
									</span>
								</Link>
								<div className="hidden sm:ml-8 sm:block">
									<div className="flex space-x-3">
										{filteredNavigation.map((item) => (
											<Link
												key={item.name}
												href={item.href}
												className={classNames(
													pathname === item.href
														? "bg-sky-600 text-white shadow-md font-semibold"
														: "text-gray-300 hover:text-sky-300 hover:bg-gray-700/50 focus:text-sky-300 focus:bg-gray-700/60 transition-all duration-300 ease-in-out",
													"rounded-lg px-3.5 py-2 text-sm font-medium focus:outline-none transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm"
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
								<Menu as="div" className="relative ml-4">
									<div>
										<Menu.Button className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 hover:ring-sky-500 transition-all duration-300 ease-in-out transform hover:scale-105">
											<span className="absolute -inset-1.5" />
											<span className="sr-only">Open user menu</span>
											<div className="h-9 w-9 rounded-full bg-sky-500 flex items-center justify-center text-white text-base font-semibold ring-1 ring-sky-400">
												{session.user?.name?.[0]?.toUpperCase()}
											</div>
										</Menu.Button>
									</div>
									<Menu.Items className="absolute right-0 z-20 mt-2.5 w-64 origin-top-right rounded-lg bg-white py-1.5 shadow-2xl ring-1 ring-black ring-opacity-10 focus:outline-none">
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
													onClick={() => alert("Account information feature is coming soon!")}
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
											? "bg-sky-600/30 text-sky-300"
											: "text-gray-400 hover:bg-gray-700/70 hover:text-sky-300",
										"block rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-200 ease-in-out"
									)}
								>
									{item.name}
								</Link>
							))}
						</div>
					</Disclosure.Panel>
				</div>
			)}
		</Disclosure>
	);
}
