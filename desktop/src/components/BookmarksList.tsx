import { useEffect, useState } from "react";
import {
  getBookmarks,
  removeBookmark,
  type BookmarksData,
  type BookmarkData,
} from "../hooks/useTauriCommands";

function BookmarksList() {
  const [bookmarksData, setBookmarksData] = useState<BookmarksData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    try {
      const data = await getBookmarks();
      setBookmarksData(data);
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
    const interval = setInterval(fetchBookmarks, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (bookmarkId: string) => {
    if (!confirm("Supprimer ce favori ?")) return;

    try {
      await removeBookmark(bookmarkId);
      fetchBookmarks();
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const filteredBookmarks = bookmarksData?.bookmarks.filter((bookmark) => {
    const term = searchTerm.toLowerCase();
    const title = (bookmark.title || "").toLowerCase();
    const url = (bookmark.url || "").toLowerCase();
    return title.includes(term) || url.includes(term);
  }) || [];

  if (loading) {
    return <div className="loading">Chargement des favoris...</div>;
  }

  return (
    <div className="bookmarks-list">
      <div className="bookmarks-header">
        <h2>Favoris synchronisés</h2>
        <div className="bookmarks-meta">
          <span>{bookmarksData?.metadata.total_bookmarks || 0} favoris</span>
          {bookmarksData?.last_updated && (
            <span>
              Mis à jour: {new Date(bookmarksData.last_updated).toLocaleString("fr-FR")}
            </span>
          )}
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher un favori..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="bookmarks-container">
        {filteredBookmarks.length === 0 ? (
          <div className="empty-state">
            {searchTerm
              ? "Aucun favori ne correspond à votre recherche"
              : "Aucun favori synchronisé"}
          </div>
        ) : (
          <ul className="bookmarks">
            {filteredBookmarks.map((bookmark, index) => (
              <BookmarkItem
                key={bookmark.id || index}
                bookmark={bookmark}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface BookmarkItemProps {
  bookmark: BookmarkData;
  onDelete: (id: string) => void;
}

function BookmarkItem({ bookmark, onDelete }: BookmarkItemProps) {
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  return (
    <li className="bookmark-item">
      <div className="bookmark-icon">
        {bookmark.url ? (
          <img
            src={getFavicon(bookmark.url)}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span>📄</span>
        )}
      </div>
      <div className="bookmark-content">
        <span className="bookmark-title">{bookmark.title || "Sans titre"}</span>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bookmark-url"
        >
          {bookmark.url}
        </a>
      </div>
      <div className="bookmark-actions">
        {bookmark.id && (
          <button
            className="btn-icon btn-delete"
            onClick={() => onDelete(bookmark.id!)}
            title="Supprimer"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  );
}

export default BookmarksList;
