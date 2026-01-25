import { useCallback, useEffect, useState } from "react";
import {
  getBookmarks,
  removeBookmark,
  updateBookmark,
  type BookmarksData,
  type BookmarkData,
} from "../hooks/useTauriCommands";
import { useBookmarksUpdated } from "../hooks/useRealtimeEvents";

function BookmarksList() {
  const [bookmarksData, setBookmarksData] = useState<BookmarksData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Charger les données initiales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await getBookmarks();
        setBookmarksData(data);
      } catch (error) {
        console.error("Failed to fetch bookmarks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Écouter les mises à jour des favoris en temps réel
  const handleBookmarksUpdate = useCallback((newData: BookmarksData) => {
    setBookmarksData(newData);
  }, []);

  useBookmarksUpdated(handleBookmarksUpdate);

  const handleDelete = async (bookmarkId: string) => {
    if (!confirm("Supprimer ce favori ?")) return;

    try {
      await removeBookmark(bookmarkId);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const handleEdit = (bookmarkId: string) => {
    setEditingId(bookmarkId);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (bookmark: BookmarkData) => {
    if (!bookmark.id) return;

    try {
      await updateBookmark(bookmark.id, bookmark);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update bookmark:", error);
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
              editingId === bookmark.id ? (
                <BookmarkEditForm
                  key={bookmark.id || index}
                  bookmark={bookmark}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <BookmarkItem
                  key={bookmark.id || index}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              )
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
  onEdit: (id: string) => void;
}

function BookmarkItem({ bookmark, onDelete, onEdit }: BookmarkItemProps) {
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
          <>
            <button
              className="btn-icon btn-edit"
              onClick={() => onEdit(bookmark.id!)}
              title="Modifier"
            >
              ✏️
            </button>
            <button
              className="btn-icon btn-delete"
              onClick={() => onDelete(bookmark.id!)}
              title="Supprimer"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </li>
  );
}

interface BookmarkEditFormProps {
  bookmark: BookmarkData;
  onSave: (bookmark: BookmarkData) => void;
  onCancel: () => void;
}

function BookmarkEditForm({ bookmark, onSave, onCancel }: BookmarkEditFormProps) {
  const [title, setTitle] = useState(bookmark.title || "");
  const [url, setUrl] = useState(bookmark.url || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...bookmark,
      title,
      url,
    });
  };

  return (
    <li className="bookmark-item bookmark-edit-form">
      <form onSubmit={handleSubmit}>
        <div className="edit-form-fields">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            className="edit-input"
            autoFocus
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            className="edit-input"
          />
        </div>
        <div className="edit-form-actions">
          <button type="submit" className="btn btn-small btn-primary">
            Enregistrer
          </button>
          <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </li>
  );
}

export default BookmarksList;
