// src/components/entities/CategoryManagerDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { entitiesApi } from "../../api/entitiesApi";
import { DEFAULT_CATEGORY } from "../../constants";

interface CategoryManagerDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: string; // e.g., "task"
  currentCategories: string[];
  onCategoriesUpdate: () => void; // Callback to refresh categories in parent
}

export const CategoryManagerDialog: React.FC<CategoryManagerDialogProps> = ({
  open,
  onClose,
  entityType,
  currentCategories,
  onCategoriesUpdate,
}) => {
  const [categories, setCategories] = useState<string[]>(currentCategories);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategories(currentCategories);
  }, [currentCategories, open]); // Reset when dialog opens or currentCategories prop changes

  const handleAddCategory = async () => {
    if (
      !newCategoryName.trim() ||
      newCategoryName.trim().toLowerCase() === DEFAULT_CATEGORY
    ) {
      setError(
        `Invalid category name. Cannot be empty or '${DEFAULT_CATEGORY}'.`,
      );
      return;
    }
    if (
      categories
        .map((c) => c.toLowerCase())
        .includes(newCategoryName.trim().toLowerCase())
    ) {
      setError(`Category '${newCategoryName.trim()}' already exists.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await entitiesApi.createEntityCategory(
        entityType,
        newCategoryName.trim(),
      );
      setNewCategoryName("");
      onCategoriesUpdate(); // Refresh parent
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (category: string) => {
    setEditingCategory(category);
    setEditedCategoryName(category);
  };

  const handleSaveEdit = async () => {
    if (
      !editingCategory ||
      !editedCategoryName.trim() ||
      editedCategoryName.trim().toLowerCase() === DEFAULT_CATEGORY
    ) {
      setError(
        `Invalid new category name for '${editingCategory}'. Cannot be empty or '${DEFAULT_CATEGORY}'.`,
      );
      return;
    }
    if (
      categories
        .map((c) => c.toLowerCase())
        .includes(editedCategoryName.trim().toLowerCase()) &&
      editingCategory.toLowerCase() !== editedCategoryName.trim().toLowerCase()
    ) {
      setError(`Category '${editedCategoryName.trim()}' already exists.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await entitiesApi.renameEntityCategory(
        entityType,
        editingCategory,
        editedCategoryName.trim(),
      );
      setEditingCategory(null);
      setEditedCategoryName("");
      onCategoriesUpdate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to rename category.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    if (categoryToDelete.toLowerCase() === DEFAULT_CATEGORY) {
      setError("The 'default' category cannot be deleted.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete the category "${categoryToDelete}"? All entities within this category will be deleted.`,
      )
    ) {
      setIsLoading(true);
      setError(null);
      try {
        // Backend logic: move_entities_to_default: false means delete entities
        await entitiesApi.deleteEntityCategory(
          entityType,
          categoryToDelete,
          false,
        );
        onCategoriesUpdate();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete category.",
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Manage Categories for{" "}
        {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <TextField
            label="New Category Name"
            variant="outlined"
            size="small"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ flexGrow: 1, mr: 1 }}
            disabled={isLoading}
          />
          <Button
            variant="contained"
            onClick={handleAddCategory}
            startIcon={<AddIcon />}
            disabled={isLoading || !newCategoryName.trim()}
          >
            Add
          </Button>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Existing Categories:
        </Typography>
        <List dense>
          {categories.map((category) => (
            <ListItem
              key={category}
              divider
              secondaryAction={
                category.toLowerCase() !== DEFAULT_CATEGORY ? (
                  <>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => handleStartEdit(category)}
                      disabled={isLoading || editingCategory === category}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={isLoading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : null
              }
            >
              {editingCategory === category ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", width: "100%" }}
                >
                  <TextField
                    autoFocus
                    variant="standard"
                    value={editedCategoryName}
                    onChange={(e) => setEditedCategoryName(e.target.value)}
                    sx={{ flexGrow: 1 }}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  />
                  <IconButton
                    onClick={handleSaveEdit}
                    size="small"
                    color="primary"
                    disabled={isLoading}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setEditingCategory(null)}
                    size="small"
                  >
                    <CancelIcon />
                  </IconButton>
                </Box>
              ) : (
                <ListItemText
                  primary={
                    category === DEFAULT_CATEGORY
                      ? `${category} (Default)`
                      : category
                  }
                />
              )}
            </ListItem>
          ))}
          {categories.length === 0 && (
            <ListItem>
              <ListItemText primary="No categories defined yet (besides default)." />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
