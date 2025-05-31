import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  List, // For displaying list values
  ListItem, // For displaying list values
  ListItemText, // For displaying list values
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
} from "@mui/icons-material";
import { entitiesApi } from "../../api/entitiesApi";
import {
  formatUtcIsoToLocalInput,
  generateHyDateTimeCode,
} from "../../components/shared/utils";

// --- Type Definitions ---
type AttributeBaseType =
  | "string"
  | "integer"
  | "decimal"
  | "boolean"
  | "datetime" // For point-in-time, UI uses datetime-local
  | "timestamp" // Can be alias for datetime or handled as special code
  | "list"
  | "enum"
  | "code" // Generic Hy code
  | "timelength" // Could be string or a specific code pattern
  | "timerange"; // Could be string or a specific code pattern

interface AttributeDefinition {
  name: string;
  label: string;
  type: AttributeBaseType;
  required?: boolean;
  default_value?: any;
  enum_choices?: string[];
  // For 'list' type, we might eventually want to specify item type
  // item_type?: 'string' | 'integer' | 'decimal';
}

interface EntityTypeInfo {
  name: string;
  attributes: Record<string, AttributeDefinition>;
  // Backend might also send other schema info, e.g., 'dynamic_field_definitions'
}

interface EntityInstance {
  name: string;
  entity_type: string;
  attributes: Record<string, any>; // Resolved values
  dynamic_fields?: Record<string, { original: string; value: any }>; // Original expressions if dynamic
}

interface FormDataAttribute {
  inputValue: any; // Handles string, number, boolean, datetime-local string, string[] for list
  hyExpression?: string; // For 'datetime' or 'code' types that generate Hy
  uiMode:
    | "datetime_picker"
    | "code_editor"
    | "boolean_select"
    | "list_editor"
    | "enum_select"
    | "default_text";
}

export const EntityDetail: React.FC = () => {
  const { entityType: entityTypeParam } = useParams<{ entityType: string }>();
  const navigate = useNavigate();

  const [entities, setEntities] = useState<EntityInstance[]>([]);
  const [entityTypeInfo, setEntityTypeInfo] = useState<EntityTypeInfo | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [currentEntity, setCurrentEntity] = useState<EntityInstance | null>(
    null,
  );
  const [formData, setFormData] = useState<
    Record<string, FormDataAttribute | string>
  >({}); // 'name' is string
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>(
    {},
  );

  const fetchAllData = useCallback(async () => {
    if (!entityTypeParam) return;
    setLoading(true);
    setError(null);
    try {
      const types: EntityTypeInfo[] = await entitiesApi.getEntityTypes();
      const typeInfo = types.find((t) => t.name === entityTypeParam);

      if (!typeInfo) {
        setError(`Entity type "${entityTypeParam}" not found.`);
        setLoading(false);
        return;
      }
      setEntityTypeInfo(typeInfo);

      const entitiesList: EntityInstance[] =
        await entitiesApi.getEntities(entityTypeParam);
      setEntities(entitiesList);
    } catch (err) {
      console.error(`Error fetching ${entityTypeParam} data:`, err);
      setError(
        `Failed to load ${entityTypeParam} data. Please try again later.`,
      );
    } finally {
      setLoading(false);
    }
  }, [entityTypeParam]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getUiModeAndInitialValue = (
    attrKey: string,
    attrDef: AttributeDefinition,
    entityData?: EntityInstance,
  ): FormDataAttribute => {
    const resolvedValue = entityData?.attributes?.[attrKey];
    const originalHy = entityData?.dynamic_fields?.[attrKey]?.original;

    // Handle 'datetime' type or 'code' type that is a datetime expression
    if (
      attrDef.type === "datetime" ||
      attrDef.type === "timestamp" || // Treat timestamp similar to datetime for UI
      (attrDef.type === "code" && originalHy?.trim().startsWith("(datetime "))
    ) {
      const initialDateTime =
        resolvedValue || (dialogMode === "create" && attrDef.default_value);
      return {
        inputValue: initialDateTime
          ? formatUtcIsoToLocalInput(initialDateTime)
          : "",
        hyExpression:
          originalHy ||
          (initialDateTime
            ? generateHyDateTimeCode(formatUtcIsoToLocalInput(initialDateTime))
            : undefined),
        uiMode: "datetime_picker",
      };
    }

    if (attrDef.type === "list") {
      const initialList =
        resolvedValue && Array.isArray(resolvedValue)
          ? resolvedValue.map(String) // Ensure items are strings for text inputs
          : dialogMode === "create" && Array.isArray(attrDef.default_value)
            ? attrDef.default_value.map(String)
            : [];
      return {
        inputValue: initialList, // Array of strings
        uiMode: "list_editor",
      };
    }

    if (attrDef.type === "enum") {
      return {
        inputValue: String(
          resolvedValue ??
            (dialogMode === "create" ? (attrDef.default_value ?? "") : ""),
        ),
        uiMode: "enum_select",
      };
    }

    if (attrDef.type === "code") {
      // Generic code (not datetime)
      return {
        inputValue:
          originalHy ||
          String(
            resolvedValue ??
              (dialogMode === "create" ? (attrDef.default_value ?? "") : ""),
          ), // Textarea shows Hy code or resolved if not dynamic
        hyExpression:
          originalHy ||
          String(
            resolvedValue ??
              (dialogMode === "create" ? (attrDef.default_value ?? "") : ""),
          ),
        uiMode: "code_editor",
      };
    }

    if (attrDef.type === "boolean") {
      return {
        inputValue: String(
          resolvedValue !== undefined
            ? resolvedValue
            : dialogMode === "create"
              ? attrDef.default_value !== undefined
                ? attrDef.default_value
                : false
              : false,
        ), // 'true' or 'false'
        uiMode: "boolean_select",
      };
    }

    // Default for string, integer, decimal, timelength, timerange (treat as string input for now)
    return {
      inputValue: String(
        resolvedValue ??
          (dialogMode === "create" ? (attrDef.default_value ?? "") : ""),
      ),
      uiMode: "default_text",
    };
  };

  const handleOpenCreateDialog = () => {
    setDialogMode("create"); // Set mode before generating initial form data
    setCurrentEntity(null);
    const initialFormData: Record<string, FormDataAttribute | string> = {
      name: "",
    };
    if (entityTypeInfo?.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(([key, attrDef]) => {
        initialFormData[key] = getUiModeAndInitialValue(key, attrDef);
      });
    }
    setFormData(initialFormData);
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (entity: EntityInstance) => {
    setDialogMode("edit"); // Set mode
    setCurrentEntity(entity);
    const newFormData: Record<string, FormDataAttribute | string> = {
      name: entity.name,
    };
    if (entityTypeInfo?.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(([key, attrDef]) => {
        newFormData[key] = getUiModeAndInitialValue(key, attrDef, entity);
      });
    }
    setFormData(newFormData);
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentEntity(null);
    // setFormData({}); // Optionally clear form data
    // setFormErrors({});
  };

  // --- Form Input Handlers ---
  const handleFormInputChange = (attrKey: string, newValue: any) => {
    setFormData((prev) => {
      const currentAttrData = prev[attrKey] as FormDataAttribute;
      let newAttrData: FormDataAttribute = { ...currentAttrData };

      switch (currentAttrData.uiMode) {
        case "datetime_picker":
          newAttrData.inputValue = newValue as string; // datetime-local string
          newAttrData.hyExpression =
            generateHyDateTimeCode(newValue as string) || undefined;
          break;
        case "code_editor":
          newAttrData.inputValue = newValue as string; // The code itself
          newAttrData.hyExpression = newValue as string;
          break;
        // list_editor is handled by specific list functions
        case "boolean_select":
        case "enum_select":
        case "default_text":
          newAttrData.inputValue = newValue; // string, boolean string
          break;
      }
      return { ...prev, [attrKey]: newAttrData };
    });
    if (formErrors[attrKey]) {
      setFormErrors((prev) => ({ ...prev, [attrKey]: null }));
    }
  };

  const handleListItemChange = (
    attrKey: string,
    index: number,
    itemValue: string,
  ) => {
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormDataAttribute;
      const newListValue = [...(attrData.inputValue as string[])];
      newListValue[index] = itemValue;
      return {
        ...prev,
        [attrKey]: { ...attrData, inputValue: newListValue },
      };
    });
  };

  const handleAddListItem = (attrKey: string) => {
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormDataAttribute;
      const newListValue = [...(attrData.inputValue as string[]), ""]; // Add empty string
      return {
        ...prev,
        [attrKey]: { ...attrData, inputValue: newListValue },
      };
    });
  };

  const handleRemoveListItem = (attrKey: string, index: number) => {
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormDataAttribute;
      const newListValue = (attrData.inputValue as string[]).filter(
        (_, i) => i !== index,
      );
      return {
        ...prev,
        [attrKey]: { ...attrData, inputValue: newListValue },
      };
    });
  };

  // --- Form Validation & Submission ---
  const validateForm = (): boolean => {
    const errors: Record<string, string | null> = {};
    const currentName = formData.name as string;
    if (!currentName || !currentName.trim()) errors.name = "Name is required";
    if (
      dialogMode === "create" &&
      entities.some((e) => e.name === currentName.trim())
    ) {
      errors.name = "An entity with this name already exists.";
    } else if (
      dialogMode === "edit" &&
      currentEntity &&
      currentName.trim() !== currentEntity.name &&
      entities.some((e) => e.name === currentName.trim())
    ) {
      errors.name = "An entity with this name already exists.";
    }

    if (entityTypeInfo?.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(([key, attrDef]) => {
        const fieldData = formData[key] as FormDataAttribute;
        if (!fieldData) return; // Should not happen if form initialized correctly

        if (
          attrDef.required &&
          (fieldData.inputValue === undefined ||
            fieldData.inputValue === "" ||
            (Array.isArray(fieldData.inputValue) &&
              fieldData.inputValue.length === 0))
        ) {
          errors[key] = `${attrDef.label || key} is required.`;
        }

        if (fieldData.uiMode === "datetime_picker") {
          if (fieldData.inputValue && !fieldData.hyExpression) {
            errors[key] = `Invalid date/time for ${attrDef.label || key}.`;
          }
        } else if (fieldData.uiMode === "list_editor") {
          if (
            attrDef.required &&
            (fieldData.inputValue as string[]).length === 0
          ) {
            errors[key] = `${attrDef.label || key} requires at least one item.`;
          }
          // Could add validation for individual list items if needed
        } else if (
          attrDef.type === "integer" &&
          fieldData.inputValue &&
          !/^-?\d+$/.test(String(fieldData.inputValue))
        ) {
          errors[key] = `${attrDef.label || key} must be a valid integer.`;
        } else if (
          attrDef.type === "decimal" &&
          fieldData.inputValue &&
          isNaN(parseFloat(String(fieldData.inputValue)))
        ) {
          errors[key] = `${attrDef.label || key} must be a valid decimal.`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !entityTypeInfo) return;

    const attributesToSave: Record<string, any> = {};
    // Backend expects dynamic fields separate if is_dynamic=true, similar to Config
    const dynamicFieldsPayload: Record<string, { original: string }> = {};

    Object.entries(formData).forEach(([key, formFieldData]) => {
      if (key === "name") return;

      const attrDef = entityTypeInfo.attributes[key];
      if (!attrDef) return; // Should not happen

      const fieldData = formFieldData as FormDataAttribute;
      let valueToSave: any;
      let isDynamic = false;
      let originalExpression: string | undefined = undefined;

      switch (fieldData.uiMode) {
        case "datetime_picker":
          if (fieldData.inputValue && fieldData.hyExpression) {
            try {
              // The inputValue is datetime-local string. Convert to ISO for backend.
              valueToSave = new Date(
                fieldData.inputValue as string,
              ).toISOString();
              originalExpression = fieldData.hyExpression;
              isDynamic = true; // Datetime picker implies dynamic Hy code generation
            } catch (e) {
              console.error(
                "Error parsing date for save:",
                fieldData.inputValue,
              );
              // This should be caught by validation, but as a safeguard:
              setFormErrors((prev) => ({
                ...prev,
                [key]: "Invalid date format",
              }));
              return; // Abort save for this field or entire submission
            }
          } else if (attrDef.required) {
            // This should be caught by validation
            console.error("Datetime required but not provided or invalid.");
            return;
          } else {
            valueToSave = null; // Allow clearing if not required
          }
          break;
        case "code_editor":
          valueToSave = fieldData.inputValue as string; // The code itself
          // Determine if it's dynamic (starts with '(')
          if (
            typeof valueToSave === "string" &&
            valueToSave.trim().startsWith("(")
          ) {
            isDynamic = true;
            originalExpression = valueToSave;
          }
          break;
        case "list_editor":
          // Assuming list items are strings for now.
          // If item types were supported (int, bool), parsing would be needed here.
          valueToSave = fieldData.inputValue as string[];
          break;
        case "boolean_select":
          valueToSave =
            fieldData.inputValue === "true"
              ? true
              : fieldData.inputValue === "false"
                ? false
                : attrDef.required
                  ? false
                  : null; // Default to false if required and empty string, else null
          break;
        case "enum_select":
          valueToSave = fieldData.inputValue as string;
          if (valueToSave === "" && !attrDef.required) valueToSave = null;
          break;
        case "default_text":
          valueToSave = fieldData.inputValue;
          if (attrDef.type === "integer") {
            valueToSave = parseInt(valueToSave, 10);
            if (isNaN(valueToSave) && attrDef.required) {
              console.error("Integer required but NaN.");
              return;
            } else if (isNaN(valueToSave)) valueToSave = null;
          } else if (attrDef.type === "decimal") {
            valueToSave = parseFloat(valueToSave);
            if (isNaN(valueToSave) && attrDef.required) {
              console.error("Decimal required but NaN.");
              return;
            } else if (isNaN(valueToSave)) valueToSave = null;
          } else if (valueToSave === "" && !attrDef.required) {
            valueToSave = null;
          }
          break;
        default:
          valueToSave = fieldData.inputValue;
      }

      attributesToSave[key] = valueToSave;
      if (isDynamic && originalExpression) {
        // For entities API, we might send this information differently.
        // The example `updateEntityAttribute` takes `value, isDynamic, original`.
        // This part needs to align with how `createEntity` expects dynamic fields.
        // If `createEntity` takes a `dynamic_fields` map:
        dynamicFieldsPayload[key] = { original: originalExpression };
      }
    });

    try {
      const entityName = (formData.name as string).trim();
      const currentEntityType = entityTypeInfo.name;

      if (dialogMode === "create") {
        await entitiesApi.createEntity({
          name: entityName,
          entity_type: currentEntityType,
          attributes: attributesToSave,
          // If your backend expects dynamic fields in a separate top-level key:
          dynamic_fields: dynamicFieldsPayload,
        });
      } else if (dialogMode === "edit" && currentEntity) {
        const previousName = currentEntity.name;
        if (entityName !== previousName) {
          await entitiesApi.renameEntity(
            currentEntityType,
            previousName,
            entityName,
          );
        }

        // Update attributes one by one (consistent with ConfigCard's save logic)
        for (const attrKey of Object.keys(attributesToSave)) {
          const attrValue = attributesToSave[attrKey];
          const dynamicInfo = dynamicFieldsPayload[attrKey];

          await entitiesApi.updateEntityAttribute(
            currentEntityType,
            entityName, // Use new name if renamed
            attrKey,
            attrValue, // The resolved value
            !!dynamicInfo, // is_dynamic
            dynamicInfo?.original, // original expression
          );
        }
      }
      fetchAllData();
      handleCloseDialog();
    } catch (err: any) {
      console.error("Error saving entity:", err);
      const errorDetail =
        err.response?.data?.detail || err.message || "Unknown error";
      // Display error in a more user-friendly way, perhaps in the dialog
      setFormErrors((prev) => ({
        ...prev,
        _submission: `Failed to save entity: ${errorDetail}`,
      }));
      // Or use a general error state for the page: setError(...);
    }
  };

  // --- Entity Deletion ---
  const handleDeleteEntity = async (entityName: string) => {
    if (!entityTypeInfo) return;
    if (window.confirm(`Are you sure you want to delete "${entityName}"?`)) {
      try {
        await entitiesApi.deleteEntity(entityTypeInfo.name, entityName);
        fetchAllData();
      } catch (err) {
        console.error("Error deleting entity:", err);
        setError("Failed to delete entity. Please try again.");
      }
    }
  };

  // --- Value Rendering for Table ---
  const renderAttributeValue = (
    value: any,
    attrKey: string,
    entity: EntityInstance,
  ): React.ReactNode => {
    if (!entityTypeInfo) return String(value ?? "N/A");
    const attrDef = entityTypeInfo.attributes[attrKey];
    if (!attrDef) return String(value ?? "N/A");

    const originalHy = entity?.dynamic_fields?.[attrKey]?.original;

    if (
      attrDef.type === "datetime" ||
      attrDef.type === "timestamp" ||
      (attrDef.type === "code" && originalHy?.trim().startsWith("(datetime "))
    ) {
      try {
        if (!value) return "N/A";
        return new Date(value).toLocaleString();
      } catch {
        return String(value ?? "Invalid Date");
      }
    }

    if (attrDef.type === "code" && originalHy) {
      return (
        <Box>
          <Typography
            variant="caption"
            display="block"
            sx={{ color: "text.secondary" }}
          >
            <code>
              {originalHy.length > 50
                ? originalHy.substring(0, 47) + "..."
                : originalHy}
            </code>
          </Typography>
          <Typography variant="body2">→ {String(value ?? "N/A")}</Typography>
        </Box>
      );
    }

    if (attrDef.type === "list" && Array.isArray(value)) {
      if (value.length === 0)
        return (
          <Typography variant="caption">
            <em>(empty list)</em>
          </Typography>
        );
      return (
        <List
          dense
          disablePadding
          sx={{
            maxHeight: 100,
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "4px",
          }}
        >
          {value.map((item, index) => (
            <ListItem key={index} dense disableGutters sx={{ pl: 1, pr: 1 }}>
              <ListItemText
                primaryTypographyProps={{ variant: "body2" }}
                primary={String(item)}
              />
            </ListItem>
          ))}
        </List>
      );
    }

    if (attrDef.type === "boolean") {
      return value === true ? "Yes" : value === false ? "No" : "N/A";
    }

    return String(value ?? "N/A");
  };

  // --- Dialog Content Rendering ---
  const renderDialogFields = () => {
    if (!entityTypeInfo?.attributes) return null;

    return Object.entries(entityTypeInfo.attributes).map(
      ([attrKey, attrDef]) => {
        const fieldData = formData[attrKey] as FormDataAttribute;
        const errorText = formErrors[attrKey];

        if (!fieldData) {
          // This might happen if formData is not correctly initialized or entityTypeInfo changes unexpectedly.
          console.warn(
            `No form data for ${attrKey} during render. Current entityTypeInfo:`,
            entityTypeInfo,
            `Current formData:`,
            formData,
          );
          return (
            <Typography key={attrKey} color="error" sx={{ mb: 2 }}>
              Configuration error for "{attrDef.label || attrKey}". Please try
              reopening the form.
            </Typography>
          );
        }

        switch (fieldData.uiMode) {
          case "datetime_picker":
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={attrDef.label || attrKey}
                type="datetime-local"
                fullWidth
                value={fieldData.inputValue || ""}
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={errorText || (attrDef.required ? "Required" : "")}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            );

          case "code_editor":
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={`${attrDef.label || attrKey} (Hy Code)`}
                type="text"
                multiline
                rows={3}
                fullWidth
                value={fieldData.inputValue || ""} // This is the Hy code
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={errorText || (attrDef.required ? "Required" : "")}
                sx={{ mb: 2 }}
                InputProps={{ style: { fontFamily: "monospace" } }}
              />
            );

          case "list_editor":
            return (
              <Box
                key={attrKey}
                sx={{
                  mb: 2,
                  p: 1,
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {attrDef.label || attrKey} {attrDef.required ? "*" : ""}
                </Typography>
                {(fieldData.inputValue as string[]).map((item, index) => (
                  <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    key={index}
                    sx={{ mb: 0.5 }}
                  >
                    <Grid item xs>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={`Item ${index + 1}`}
                        value={item}
                        onChange={(e) =>
                          handleListItemChange(attrKey, index, e.target.value)
                        }
                      />
                    </Grid>
                    <Grid item xs="auto">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveListItem(attrKey, index)}
                        color="error"
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddListItem(attrKey)}
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  Add Item
                </Button>
                {errorText && (
                  <FormHelperText error>{errorText}</FormHelperText>
                )}
              </Box>
            );

          case "enum_select":
            return (
              <FormControl
                fullWidth
                margin="dense"
                error={!!errorText}
                sx={{ mb: 2 }}
              >
                <InputLabel id={`${attrKey}-label`}>
                  {attrDef.label || attrKey}
                </InputLabel>
                <Select
                  labelId={`${attrKey}-label`}
                  value={String(fieldData.inputValue ?? "")}
                  label={attrDef.label || attrKey}
                  onChange={(e) =>
                    handleFormInputChange(attrKey, e.target.value)
                  }
                >
                  {!attrDef.required && (
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                  )}
                  {(attrDef.enum_choices || []).map((choice) => (
                    <MenuItem key={choice} value={choice}>
                      {choice}
                    </MenuItem>
                  ))}
                </Select>
                {errorText && <FormHelperText>{errorText}</FormHelperText>}
                {!errorText && attrDef.required && (
                  <FormHelperText>Required</FormHelperText>
                )}
              </FormControl>
            );

          case "boolean_select":
            return (
              <FormControl
                fullWidth
                margin="dense"
                error={!!errorText}
                sx={{ mb: 2 }}
              >
                <InputLabel id={`${attrKey}-label`}>
                  {attrDef.label || attrKey}
                </InputLabel>
                <Select
                  labelId={`${attrKey}-label`}
                  value={String(fieldData.inputValue ?? "false")} // Default to "false" string if null/undefined for select
                  label={attrDef.label || attrKey}
                  onChange={(e) =>
                    handleFormInputChange(attrKey, e.target.value)
                  } // Value will be "true" or "false" string
                >
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                  {!attrDef.required && ( // Allow 'None' if not required
                    <MenuItem value="">
                      <em>None (or N/A)</em>
                    </MenuItem>
                  )}
                </Select>
                {errorText && <FormHelperText>{errorText}</FormHelperText>}
                {!errorText && attrDef.required && (
                  <FormHelperText>Required</FormHelperText>
                )}
              </FormControl>
            );

          case "default_text":
          default:
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={attrDef.label || attrKey}
                type={
                  attrDef.type === "integer" || attrDef.type === "decimal"
                    ? "number"
                    : "text"
                }
                fullWidth
                value={fieldData.inputValue || ""}
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={errorText || (attrDef.required ? "Required" : "")}
                sx={{ mb: 2 }}
                InputProps={
                  attrDef.type === "decimal" ? { step: "any" } : {} // "any" for float, or specify precision like "0.01"
                }
              />
            );
        }
      },
    );
  };

  // --- Main Component Render ---
  if (loading && !entityTypeInfo) {
    // Show full page loader only on initial load
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

  if (error && !entityTypeInfo) {
    // Show full page error if type info failed
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button variant="contained" onClick={fetchAllData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!entityTypeInfo) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6">
          Entity type "{entityTypeParam}" details not available.
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
    <Box p={entityTypeParam ? 2 : 0}>
      {" "}
      {/* No padding if inside another layout */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          {entityTypeInfo.name.charAt(0).toUpperCase() +
            entityTypeInfo.name.slice(1)}
          s
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
          color="primary"
        >
          Create New {entityTypeInfo.name}
        </Button>
      </Box>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error &&
        !loading && ( // Show table-level error if entities failed to load but typeInfo is present
          <Typography color="error" sx={{ my: 2 }}>
            {error}{" "}
            <Button onClick={fetchAllData} size="small">
              Retry
            </Button>
          </Typography>
        )}
      {!loading && entities.length === 0 && !error && (
        <Typography sx={{ my: 2, textAlign: "center" }}>
          No {entityTypeInfo.name} entities found.
        </Typography>
      )}
      {!loading && entities.length > 0 && (
        <Paper elevation={3}>
          <TableContainer>
            <Table stickyHeader aria-label={`Table of ${entityTypeInfo.name}s`}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                  {Object.values(entityTypeInfo.attributes).map((attrDef) => (
                    <TableCell key={attrDef.name} sx={{ fontWeight: "bold" }}>
                      {attrDef.label || attrDef.name}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow hover key={entity.name}>
                    <TableCell component="th" scope="row">
                      {entity.name}
                    </TableCell>
                    {Object.keys(entityTypeInfo.attributes).map((attrKey) => (
                      <TableCell key={attrKey}>
                        {renderAttributeValue(
                          entity.attributes[attrKey],
                          attrKey,
                          entity,
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleOpenEditDialog(entity)}
                        size="small"
                        title={`Edit ${entity.name}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteEntity(entity.name)}
                        size="small"
                        color="error"
                        title={`Delete ${entity.name}`}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            handleSubmit();
          },
        }}
      >
        <DialogTitle>
          {dialogMode === "create"
            ? `Create New ${entityTypeInfo.name}`
            : `Edit ${currentEntity?.name || "Entity"}`}
        </DialogTitle>
        <DialogContent dividers>
          {" "}
          {/* dividers add padding and lines */}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            value={(formData.name as string) || ""}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (formErrors.name) {
                setFormErrors((prev) => ({ ...prev, name: null }));
              }
            }}
            error={!!formErrors.name}
            helperText={
              formErrors.name || "Unique identifier for the entity. Required."
            }
            sx={{ mb: 2 }}
          />
          {renderDialogFields()}
          {formErrors._submission && ( // Display general submission error
            <Typography color="error" sx={{ mt: 2 }}>
              {formErrors._submission}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {dialogMode === "create" ? "Create" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
