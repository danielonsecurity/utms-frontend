// src/pages/Entities/EntityDetail.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { entitiesApi } from "../../api/entitiesApi";

export const EntityDetail: React.FC = () => {
  const { entityType } = useParams<{ entityType: string }>();
  const navigate = useNavigate();

  const [entities, setEntities] = useState<any[]>([]);
  const [entityTypeInfo, setEntityTypeInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [currentEntity, setCurrentEntity] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!entityType) return;

      try {
        setLoading(true);

        // Fetch entity type info
        const types = await entitiesApi.getEntityTypes();
        const typeInfo = types.find((t: any) => t.name === entityType);

        if (!typeInfo) {
          setError(`Entity type "${entityType}" not found`);
          setLoading(false);
          return;
        }

        setEntityTypeInfo(typeInfo);

        // Fetch entities of this type
        const entitiesList = await entitiesApi.getEntities(entityType);
        setEntities(entitiesList);

        setError(null);
      } catch (err) {
        console.error(`Error fetching ${entityType} entities:`, err);
        setError(
          `Failed to load ${entityType} entities. Please try again later.`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entityType]);

  const handleOpenCreateDialog = () => {
    // Initialize form with default values from entity type
    const initialFormData: any = {};

    if (entityTypeInfo && entityTypeInfo.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(
        ([key, value]: [string, any]) => {
          // Set default values based on attribute type
          if (value === null) {
            initialFormData[key] = "";
          } else {
            initialFormData[key] = value;
          }
        },
      );
    }

    setFormData(initialFormData);
    setFormErrors({});
    setDialogMode("create");
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (entity: any) => {
    setCurrentEntity(entity);
    setFormData({
      name: entity.name,
      ...entity.attributes,
    });
    setFormErrors({});
    setDialogMode("edit");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentEntity(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  const validateForm = () => {
    const errors: any = {};

    // Name is required
    if (!formData.name) {
      errors.name = "Name is required";
    }

    // Add validation for required fields from entity type
    if (entityTypeInfo && entityTypeInfo.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(
        ([key, value]: [string, any]) => {
          // Add validation rules based on attribute type if needed
        },
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (dialogMode === "create") {
        // Extract name from form data
        const { name, ...attributes } = formData;

        await entitiesApi.createEntity({
          name,
          entity_type: entityType!,
          attributes,
        });

        // Refresh entities list
        const updatedEntities = await entitiesApi.getEntities(entityType!);
        setEntities(updatedEntities);
      } else if (dialogMode === "edit" && currentEntity) {
        // Extract name from form data
        const { name, ...attributes } = formData;

        // Update each attribute individually
        for (const [key, value] of Object.entries(attributes)) {
          await entitiesApi.updateEntityAttribute(
            entityType!,
            currentEntity.name,
            key,
            value,
          );
        }

        // If name changed, rename the entity
        if (name !== currentEntity.name) {
          await entitiesApi.renameEntity(entityType!, currentEntity.name, name);
        }

        // Refresh entities list
        const updatedEntities = await entitiesApi.getEntities(entityType!);
        setEntities(updatedEntities);
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Error saving entity:", err);
      setError("Failed to save entity. Please try again.");
    }
  };

  const handleDeleteEntity = async (entityName: string) => {
    if (window.confirm(`Are you sure you want to delete ${entityName}?`)) {
      try {
        await entitiesApi.deleteEntity(entityType!, entityName);

        // Refresh entities list
        const updatedEntities = await entitiesApi.getEntities(entityType!);
        setEntities(updatedEntities);
      } catch (err) {
        console.error("Error deleting entity:", err);
        setError("Failed to delete entity. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
        <Box mt={2}>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mr: 2 }}
          >
            Retry
          </Button>
          <Button variant="outlined" onClick={() => navigate("/entities")}>
            Back to Entities
          </Button>
        </Box>
      </Box>
    );
  }

  if (!entityTypeInfo) {
    return (
      <Box p={3}>
        <Typography>Entity type not found</Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/entities")}
          sx={{ mt: 2 }}
        >
          Back to Entities
        </Button>
      </Box>
    );
  }

  const renderAttributeValue = (value: any) => {
    if (value === null || value === undefined) {
      return (
        <Typography variant="body2" color="textSecondary">
          None
        </Typography>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <Typography variant="body2" color="textSecondary">
            Empty list
          </Typography>
        );
      }

      return (
        <Box>
          {value.map((item, index) => (
            <Chip
              key={index}
              label={item}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      );
    }

    if (typeof value === "object" && value !== null) {
      return <Typography variant="body2">{JSON.stringify(value)}</Typography>;
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return value.toString();
  };

  return (
    <div>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <div>
          <Typography variant="h4" gutterBottom>
            {entityType?.charAt(0).toUpperCase() + entityType?.slice(1)}s
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your {entityType} entities
          </Typography>
        </div>
        <div>
          <Button
            variant="outlined"
            onClick={() => navigate("/entities")}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create {entityType}
          </Button>
        </div>
      </Box>

      {entities.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography variant="h6" gutterBottom>
            No {entityType}s found
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Get started by creating your first {entityType}.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create {entityType}
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {entityTypeInfo &&
                  entityTypeInfo.attributes &&
                  Object.keys(entityTypeInfo.attributes).map((attr) => (
                    <TableCell key={attr}>{attr}</TableCell>
                  ))}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entities.map((entity) => (
                <TableRow key={entity.name}>
                  <TableCell component="th" scope="row">
                    {entity.name}
                  </TableCell>
                  {entityTypeInfo &&
                    entityTypeInfo.attributes &&
                    Object.keys(entityTypeInfo.attributes).map((attr) => (
                      <TableCell key={attr}>
                        {renderAttributeValue(entity.attributes[attr])}
                      </TableCell>
                    ))}
                  <TableCell align="right">
                    <IconButton
                      aria-label="edit"
                      onClick={() => handleOpenEditDialog(entity)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      onClick={() => handleDeleteEntity(entity.name)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "create"
            ? `Create New ${entityType}`
            : `Edit ${currentEntity?.name}`}
        </DialogTitle>
        <DialogContent>
          <Box p={1}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              value={formData.name || ""}
              onChange={handleInputChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={{ mb: 2 }}
            />

            {entityTypeInfo &&
              entityTypeInfo.attributes &&
              Object.entries(entityTypeInfo.attributes).map(
                ([attr, defaultValue]: [string, any]) => (
                  <TextField
                    key={attr}
                    margin="dense"
                    name={attr}
                    label={attr}
                    type="text"
                    fullWidth
                    value={formData[attr] || ""}
                    onChange={handleInputChange}
                    error={!!formErrors[attr]}
                    helperText={formErrors[attr]}
                    sx={{ mb: 2 }}
                  />
                ),
              )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === "create" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
