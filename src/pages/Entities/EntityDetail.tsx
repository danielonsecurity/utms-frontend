import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Paper,
} from "@mui/material";
import { Add as AddIcon, Settings as SettingsIcon } from "@mui/icons-material";

import { entitiesApi } from "../../api/entitiesApi";
import {
  EntityTypeDetail,
  Entity as EntityInstance,
  EntityTypeDetailList,
} from "../../types/entities";
import { DEFAULT_CATEGORY } from "../../constants"; // Ensure this file exists and exports DEFAULT_CATEGORY

// Import the new child components
import { CategoryManagerDialog } from "../../components/entities/CategoryManagerDialog";
import { EntityTable } from "../../components/entities/EntityTable";
import { EntityFormDialog } from "../../components/entities/EntityFormDialog";

export const EntityDetail: React.FC = () => {
  const { entityType: entityTypeParamFromUrl } = useParams<{
    entityType: string;
  }>();
  const navigate = useNavigate();

  // State for data
  const [entityTypeInfo, setEntityTypeInfo] = useState<EntityTypeDetail | null>(
    null,
  );
  const [categories, setCategories] = useState<string[]>([DEFAULT_CATEGORY]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>(DEFAULT_CATEGORY);
  const [entities, setEntities] = useState<EntityInstance[]>([]);

  // State for UI control
  const [loadingSchemaAndCategories, setLoadingSchemaAndCategories] =
    useState<boolean>(true);
  const [loadingEntities, setLoadingEntities] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [openEntityDialog, setOpenEntityDialog] = useState<boolean>(false);
  const [entityDialogMode, setEntityDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [currentEditingEntity, setCurrentEditingEntity] =
    useState<EntityInstance | null>(null);
  const [openCategoryManagerDialog, setOpenCategoryManagerDialog] =
    useState<boolean>(false);

  // Fetch schema and categories for the current entity type
  const fetchSchemaAndCategories = useCallback(async () => {
    if (!entityTypeParamFromUrl) {
      setPageError("Entity type parameter is missing from URL.");
      setLoadingSchemaAndCategories(false);
      return;
    }
    setLoadingSchemaAndCategories(true);
    setPageError(null);
    try {
      const typesList: EntityTypeDetailList =
        await entitiesApi.getEntityTypes();
      const typeInfo = typesList.find((t) => t.name === entityTypeParamFromUrl);

      if (!typeInfo) {
        setPageError(
          `Schema for entity type "${entityTypeParamFromUrl}" not found.`,
        );
        setEntityTypeInfo(null);
        setCategories([DEFAULT_CATEGORY]);
        setEntities([]);
        return;
      }
      setEntityTypeInfo(typeInfo);
      console.log("Fetched EntityTypeInfo:", typeInfo);

      const fetchedCategoriesApi = await entitiesApi.getCategoriesForEntityType(
        entityTypeParamFromUrl,
      );
      const allAvailableCats = Array.from(
        new Set([DEFAULT_CATEGORY, ...fetchedCategoriesApi]),
      );
      setCategories(allAvailableCats);

      // If current selectedCategory isn't valid anymore, reset.
      // This also handles the initial case where selectedCategory might be default
      // but default is not explicitly in fetchedCategoriesApi (though it should be if exists).
      if (!allAvailableCats.includes(selectedCategory)) {
        setSelectedCategory(
          allAvailableCats.includes(DEFAULT_CATEGORY)
            ? DEFAULT_CATEGORY
            : allAvailableCats[0] || DEFAULT_CATEGORY,
        );
      }
      // Entities will be fetched by the other useEffect hook based on selectedCategory.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPageError(`Failed to load schema or categories: ${msg}.`);
    } finally {
      setLoadingSchemaAndCategories(false);
    }
  }, [entityTypeParamFromUrl, selectedCategory]); // Added selectedCategory as it influences its own reset

  // Fetch entity instances when entityTypeInfo, selectedCategory, or categories list changes
  const fetchEntitiesForCurrentCategory = useCallback(async () => {
    if (
      !entityTypeParamFromUrl ||
      !selectedCategory ||
      !entityTypeInfo ||
      !categories.includes(selectedCategory)
    ) {
      // Do not fetch if essential info is missing or selected category is invalid
      if (
        entityTypeInfo &&
        categories.length > 0 &&
        !categories.includes(selectedCategory)
      ) {
        // This case should ideally be handled by fetchSchemaAndCategories resetting selectedCategory
        console.warn(
          `Attempted to fetch entities for invalid category '${selectedCategory}'. Categories: ${categories.join(", ")}`,
        );
      }
      return;
    }

    setLoadingEntities(true);
    // setPageError(null); // Keep page-level errors, only clear specific list errors if needed
    try {
      const entitiesFromApi: EntityInstance[] = await entitiesApi.getEntities(
        entityTypeParamFromUrl,
        selectedCategory,
      );
      setEntities(entitiesFromApi);
      console.log(
        `Fetched ${entitiesFromApi.length} Entities for ${entityTypeParamFromUrl}/${selectedCategory}:`,
        entitiesFromApi,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPageError(
        `Failed to load entities for category '${selectedCategory}': ${msg}.`,
      );
      setEntities([]); // Clear entities on error for this category
    } finally {
      setLoadingEntities(false);
    }
  }, [entityTypeParamFromUrl, selectedCategory, entityTypeInfo, categories]); // Added categories

  useEffect(() => {
    fetchSchemaAndCategories();
  }, [fetchSchemaAndCategories]); // Initial load for schema and categories

  useEffect(() => {
    // This effect runs when selectedCategory changes, or when entityTypeInfo/categories are initially set
    // or updated (which might then validate/reset selectedCategory).
    if (entityTypeInfo && selectedCategory) {
      fetchEntitiesForCurrentCategory();
    }
  }, [selectedCategory, entityTypeInfo, fetchEntitiesForCurrentCategory]);

  const handleOpenCreateEntityDialog = () => {
    if (!entityTypeInfo) {
      setPageError("Entity type schema not loaded. Cannot create entity.");
      return;
    }
    setEntityDialogMode("create");
    setCurrentEditingEntity(null);
    setOpenEntityDialog(true);
  };

  const handleOpenEditEntityDialog = (entity: EntityInstance) => {
    if (!entityTypeInfo) {
      setPageError("Entity type schema not loaded. Cannot edit entity.");
      return;
    }
    setEntityDialogMode("edit");
    setCurrentEditingEntity(entity);
    setOpenEntityDialog(true);
  };

  const handleDeleteEntity = async (
    entityName: string,
    entityCategory: string,
  ) => {
    if (!entityTypeParamFromUrl) return;
    // For deletion, use the entity's actual category, not necessarily selectedCategory
    if (
      window.confirm(
        `Are you sure you want to delete "${entityName}" from category "${entityCategory}"?`,
      )
    ) {
      try {
        await entitiesApi.deleteEntity(entityTypeParamFromUrl, entityName);
        fetchEntitiesForCurrentCategory(); // Refresh current category's entities
      } catch (err) {
        setPageError(
          `Failed to delete entity: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }
  };

  const handleEntityFormSaveSuccess = () => {
    setOpenEntityDialog(false);
    fetchEntitiesForCurrentCategory();
  };

  const handleCategoriesUpdatedByDialog = () => {
    // This will refetch categories. The useEffect watching `categories` and `selectedCategory`
    // should then handle refetching entities for the (potentially new) selectedCategory.
    fetchSchemaAndCategories();
  };

  const handleCategorySelectionChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value);
    // fetchEntitiesForCurrentCategory will be triggered by the useEffect watching selectedCategory
  };

  // --- Render Logic ---
  if (loadingSchemaAndCategories && !entityTypeInfo) {
    // Initial full-page schema loading
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  if (pageError && !entityTypeInfo) {
    // Critical error if schema couldn't load
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" variant="h6">
          {pageError}
        </Typography>
        <Button
          variant="contained"
          onClick={fetchSchemaAndCategories}
          sx={{ mt: 2 }}
        >
          Retry Schema Load
        </Button>
      </Box>
    );
  }
  if (!entityTypeInfo) {
    // Should be caught by above, but as a safeguard
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6">
          Entity type "{entityTypeParamFromUrl}" information not available.
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate("/entities")}
          sx={{ mt: 2 }}
        >
          Back to Entity Types
        </Button>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: "transparent" }}>
        {" "}
        {/* Control Bar Paper */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h4" component="h1">
            {entityTypeInfo.displayName || entityTypeParamFromUrl}s
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <FormControl
              sx={{ m: 1, minWidth: 180 }}
              size="small"
              disabled={loadingSchemaAndCategories || loadingEntities}
            >
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={
                  categories.includes(selectedCategory) ? selectedCategory : ""
                }
                label="Category"
                onChange={handleCategorySelectionChange}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat === DEFAULT_CATEGORY
                      ? "Default"
                      : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
                {categories.length === 0 && (
                  <MenuItem value="" disabled>
                    No categories found
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setOpenCategoryManagerDialog(true)}
              size="medium"
              disabled={loadingSchemaAndCategories}
            >
              Manage Categories
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateEntityDialog}
              color="primary"
              size="medium"
              disabled={loadingSchemaAndCategories}
            >
              Create New
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Display error related to fetching entities for the selected category */}
      {pageError && loadingEntities === false && entityTypeInfo && (
        <Typography color="error" sx={{ my: 2 }}>
          {pageError}
          <Button
            onClick={fetchEntitiesForCurrentCategory}
            size="small"
            sx={{ ml: 1 }}
          >
            Retry
          </Button>
        </Typography>
      )}

      {entityTypeInfo && (
        <EntityTable
          entities={entities}
          entityTypeInfo={entityTypeInfo}
          onEdit={handleOpenEditEntityDialog}
          onDelete={handleDeleteEntity} // onDelete now expects (name, category)
          isLoading={loadingEntities}
        />
      )}
      {!loadingEntities &&
        entities.length === 0 &&
        !pageError &&
        entityTypeInfo && (
          <Typography sx={{ my: 2, textAlign: "center" }}>
            No {entityTypeInfo.name} entities found in category '
            {selectedCategory}'.
          </Typography>
        )}

      {/* Dialogs are only mounted when open and entityTypeInfo is available */}
      {openEntityDialog && entityTypeInfo && (
        <EntityFormDialog
          open={openEntityDialog}
          onClose={() => setOpenEntityDialog(false)}
          dialogMode={entityDialogMode}
          entityTypeInfo={entityTypeInfo}
          currentEntity={currentEditingEntity}
          selectedCategoryOnOpen={selectedCategory}
          onSaveSuccess={handleEntityFormSaveSuccess}
        />
      )}

      {openCategoryManagerDialog && entityTypeParamFromUrl && (
        <CategoryManagerDialog
          open={openCategoryManagerDialog}
          onClose={() => setOpenCategoryManagerDialog(false)}
          entityType={entityTypeParamFromUrl}
          currentCategories={categories}
          onCategoriesUpdate={handleCategoriesUpdatedByDialog}
        />
      )}
    </Box>
  );
};
