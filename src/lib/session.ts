"use client";

import { ConnectionDetails } from "@/components/connection-form";

const ACTIVE_CONNECTION_ID_KEY = "activeConnectionId";
const CONNECTIONS_KEY = "connections";

// Add debug logs to track session operations
export function saveConnection(connectionDetails: ConnectionDetails) {
	try {
		console.log("[Session] Saving connection", connectionDetails);

		// Tarayıcı ortamında olduğumuzu kontrol et
		if (typeof window === "undefined") {
			console.error("[Session] Cannot save connection: localStorage is not available");
			return connectionDetails;
		}

		// Mevcut bağlantıları al
		const connections = getSavedConnections();
		console.log("[Session] Current connections:", connections);

		// Eğer bağlantının ID'si varsa, güncelle
		if (connectionDetails.id) {
			console.log("[Session] Updating existing connection:", connectionDetails.id);
			const updatedConnections = connections.map((conn) => (conn.id === connectionDetails.id ? connectionDetails : conn));

			// localStorage'a kaydet
			localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConnections));
			console.log("[Session] Updated connections in localStorage:", updatedConnections);

			// Aktif bağlantıyı ayarla
			setActiveConnection(connectionDetails.id);

			return connectionDetails;
		}

		// Yeni bağlantı için ID oluştur
		const newConnection = {
			...connectionDetails,
			id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
		};
		console.log("[Session] Created new connection with ID:", newConnection.id);

		// Bağlantıyı diziye ekle
		connections.push(newConnection);

		// localStorage'a kaydet
		localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
		console.log("[Session] Saved connections to localStorage:", connections);

		// Aktif bağlantıyı ayarla
		setActiveConnection(newConnection.id);

		return newConnection;
	} catch (error) {
		console.error("[Session] Error saving connection:", error);
		return connectionDetails;
	}
}

export function getSavedConnections(): ConnectionDetails[] {
	try {
		// Tarayıcı ortamında olduğumuzu kontrol et
		if (typeof window === "undefined") {
			console.warn("[Session] localStorage is not available");
			return [];
		}

		// Doğrudan localStorage'dan oku
		const connectionsStr = localStorage.getItem(CONNECTIONS_KEY);
		console.log("[Session] Raw connections from localStorage:", connectionsStr);

		// Eğer veri yoksa boş dizi döndür
		if (!connectionsStr) {
			console.log("[Session] No connections found in localStorage");
			return [];
		}

		// JSON parse et
		try {
			const connections = JSON.parse(connectionsStr);

			// Dizi kontrolü
			if (!Array.isArray(connections)) {
				console.error("[Session] Connections is not an array, resetting to empty array");
				localStorage.setItem(CONNECTIONS_KEY, JSON.stringify([]));
				return [];
			}

			console.log("[Session] Retrieved connections:", connections);
			return connections;
		} catch (error) {
			console.error("[Session] Error parsing connections:", error);
			localStorage.setItem(CONNECTIONS_KEY, JSON.stringify([]));
			return [];
		}
	} catch (error) {
		console.error("[Session] Error getting saved connections:", error);
		return [];
	}
}

export function getActiveConnectionId(): string | null {
	// Tarayıcı ortamında olduğumuzu kontrol et
	if (typeof window === "undefined") {
		console.warn("[Session] localStorage is not available");
		return null;
	}

	const id = localStorage.getItem(ACTIVE_CONNECTION_ID_KEY);
	console.log("[Session] Active connection ID:", id);
	return id;
}

export function getActiveConnection(): ConnectionDetails | null {
	const activeId = getActiveConnectionId();
	if (!activeId) return null;

	const connections = getSavedConnections();
	const connection = connections.find((c) => c.id === activeId) || null;
	console.log("[Session] Active connection:", connection);
	return connection;
}

export function setActiveConnection(connectionId: string) {
	console.log("[Session] Setting active connection:", connectionId);

	// Tarayıcı ortamında olduğumuzu kontrol et
	if (typeof window === "undefined") {
		console.error("[Session] Cannot set active connection: localStorage is not available");
		return;
	}

	localStorage.setItem(ACTIVE_CONNECTION_ID_KEY, connectionId);
}

export function deleteConnection(connectionId: string) {
	console.log("[Session] Deleting connection:", connectionId);

	// Tarayıcı ortamında olduğumuzu kontrol et
	if (typeof window === "undefined") {
		console.error("[Session] Cannot delete connection: localStorage is not available");
		return;
	}

	const connections = getSavedConnections().filter((c) => c.id !== connectionId);
	localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));

	const activeId = getActiveConnectionId();

	// If we're deleting the active connection
	if (activeId === connectionId) {
		// First clear the active connection
		clearActiveConnection();

		// Then if there are other connections, set the first one as active
		if (connections.length > 0) {
			console.log("[Session] Setting new active connection after deletion:", connections[0].id);
			setActiveConnection(connections[0].id as string);
		}
	}
}

export function clearActiveConnection() {
	console.log("[Session] Clearing active connection");

	// Tarayıcı ortamında olduğumuzu kontrol et
	if (typeof window === "undefined") {
		console.error("[Session] Cannot clear active connection: localStorage is not available");
		return;
	}

	localStorage.removeItem(ACTIVE_CONNECTION_ID_KEY);
}

export function deleteAllConnections() {
	console.log("[Session] Deleting all connections");

	// Tarayıcı ortamında olduğumuzu kontrol et
	if (typeof window === "undefined") {
		console.error("[Session] Cannot delete all connections: localStorage is not available");
		return;
	}

	localStorage.removeItem(CONNECTIONS_KEY);
	clearActiveConnection();
}
