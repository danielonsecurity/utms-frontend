import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  IconButton,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
} from "@mui/icons-material";
import {
  EntityTypeDetail,
  AttributeSchemaDetail,
  Entity as EntityInstance,
  SerializedTypedValue,
  CreateEntityPayload,
  UpdateAttributePayload,
} from "../../types/entities";
import { FormAttributeState } from "../../pages/Entities/EntityDetail"; // Re-export or move if needed
import {
  formatUtcIsoToLocalInput,
  generateHyDateTimeCode,
} from "../shared/utils";
import { entitiesApi } from "../../api/entitiesApi"; // For submitting form
import { DEFAULT_CATEGORY } from "../../constants";

interface EntityFormDialogProps {
  open: boolean;
  onClose: () => void;
  dialogMode: "create" | "edit";
  entityTypeInfo: EntityTypeDetail;
  currentEntity?: EntityInstance | null; // For editing
  selectedCategoryOnOpen: string; // Category for new entities or current category of edited entity
  onSaveSuccess: () => void; // To refresh data in parent
}

export const EntityFormDialog: React.FC<EntityFormDialogProps> = ({
  open,
  onClose,
  dialogMode,
  entityTypeInfo,
  currentEntity,
  selectedCategoryOnOpen,
  onSaveSuccess,
}) => {
  const [formData, setFormData] = useState<
    Record<string, FormAttributeState | string>
  >({});
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize/Re-initialize form data when dialog opens or relevant props change
  useEffect(() => {
    if (open && entityTypeInfo) {
      const initialFormData: Record<string, FormAttributeState | string> = {
        name: dialogMode === "edit" && currentEntity ? currentEntity.name : "",
        // Add category to form data if you want to allow changing it during edit
        // For create, it will use selectedCategoryOnOpen
        category:
          dialogMode === "edit" && currentEntity
            ? currentEntity.category
            : selectedCategoryOnOpen,
      };
      Object.entries(entityTypeInfo.attributes).forEach(([key, attrSchema]) => {
        initialFormData[key] = initializeAttributeFormData(
          key,
          attrSchema,
          dialogMode === "edit" ? currentEntity : undefined,
        );
      });
      setFormData(initialFormData);
      setFormErrors({});
    }
  }, [open, dialogMode, entityTypeInfo, currentEntity, selectedCategoryOnOpen]);

  const initializeAttributeFormData = (
    attrKey: string,
    attrSchema: AttributeSchemaDetail,
    entityInstanceData?: EntityInstance,
  ): FormAttributeState => {
    // ... (This function is identical to the one from EntityDetail.tsx - response #19)
    // For brevity, assuming it's defined and works as in response #19,
    // taking sTypedValue from entityInstanceData.attributes[attrKey]
    const sTypedValue = entityInstanceData?.attributes[attrKey];
    const resolvedValue = sTypedValue?.value;
    const originalHy = sTypedValue?.original;
    const isDynamic = sTypedValue?.is_dynamic || false;
    const actualType = sTypedValue?.type || attrSchema.type;
    if (
      attrSchema.type === "datetime" ||
      attrSchema.type === "timestamp" ||
      (isDynamic &&
        actualType === "code" &&
        originalHy?.trim().startsWith("(datetime "))
    ) {
      let initialDateTimeStr = "";
      if (
        sTypedValue &&
        sTypedValue.is_dynamic &&
        sTypedValue.original?.trim().startsWith("(datetime ")
      ) {
        if (sTypedValue.value && !String(sTypedValue.value).startsWith("(")) {
          initialDateTimeStr = formatUtcIsoToLocalInput(
            String(sTypedValue.value),
          );
        } else {
          console.warn(
            `Dynamic datetime '${attrKey}' value not ISO: ${sTypedValue.value}`,
          );
        }
      } else if (
        sTypedValue?.value &&
        !String(sTypedValue.value).startsWith("(")
      ) {
        initialDateTimeStr = formatUtcIsoToLocalInput(
          String(sTypedValue.value),
        );
      }
      if (
        !initialDateTimeStr &&
        dialogMode === "create" &&
        attrSchema.default_value &&
        !String(attrSchema.default_value).startsWith("(")
      ) {
        initialDateTimeStr = formatUtcIsoToLocalInput(
          String(attrSchema.default_value),
        );
      }
      return {
        inputValue: initialDateTimeStr,
        hyExpression:
          originalHy ||
          (initialDateTimeStr
            ? generateHyDateTimeCode(initialDateTimeStr)
            : undefined),
        uiMode: "datetime_picker",
        originalSerializedTypedValue: sTypedValue,
      };
    }
    if (attrSchema.type === "list") {
      const listValue =
        resolvedValue && Array.isArray(resolvedValue)
          ? resolvedValue
          : dialogMode === "create" && Array.isArray(attrSchema.default_value)
            ? attrSchema.default_value
            : [];
      return {
        inputValue: listValue.map(String),
        uiMode: "list_editor",
        originalSerializedTypedValue: sTypedValue,
      };
    }
    if (attrSchema.type === "enum") {
      return {
        inputValue: String(
          resolvedValue ??
            (dialogMode === "create" ? (attrSchema.default_value ?? "") : ""),
        ),
        uiMode: "enum_select",
        originalSerializedTypedValue: sTypedValue,
      };
    }
    if (attrSchema.type === "code" || isDynamic) {
      const displayInput =
        originalHy ||
        String(
          resolvedValue ??
            (dialogMode === "create" ? (attrSchema.default_value ?? "") : ""),
        );
      return {
        inputValue: displayInput,
        hyExpression: originalHy || displayInput,
        uiMode: "code_editor",
        originalSerializedTypedValue: sTypedValue,
      };
    }
    if (attrSchema.type === "boolean") {
      let initialBoolVal = false;
      if (resolvedValue !== undefined && resolvedValue !== null)
        initialBoolVal = Boolean(resolvedValue);
      else if (
        dialogMode === "create" &&
        attrSchema.default_value !== undefined
      )
        initialBoolVal = Boolean(attrSchema.default_value);
      return {
        inputValue: String(initialBoolVal),
        uiMode: "boolean_select",
        originalSerializedTypedValue: sTypedValue,
      };
    }
    return {
      inputValue: String(
        resolvedValue ??
          (dialogMode === "create" ? (attrSchema.default_value ?? "") : ""),
      ),
      uiMode: "default_text",
      originalSerializedTypedValue: sTypedValue,
    };
  };

  const handleFormInputChange = (attrKey: string, newValue: any) => {
    /* ... same as EntityDetail ... */
    setFormData((prev) => {
      const currentAttrData = prev[attrKey] as FormAttributeState;
      let newAttrData: FormAttributeState = {
        ...currentAttrData,
        inputValue: newValue,
      };
      if (currentAttrData.uiMode === "datetime_picker")
        newAttrData.hyExpression =
          generateHyDateTimeCode(newValue as string) || undefined;
      else if (currentAttrData.uiMode === "code_editor")
        newAttrData.hyExpression = newValue as string;
      return { ...prev, [attrKey]: newAttrData };
    });
    if (formErrors[attrKey])
      setFormErrors((prev) => ({ ...prev, [attrKey]: null }));
  };
  const handleListItemChange = (
    attrKey: string,
    index: number,
    itemValue: string,
  ) => {
    /* ... same ... */
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormAttributeState;
      const newListValue = [...(attrData.inputValue as string[])];
      newListValue[index] = itemValue;
      return { ...prev, [attrKey]: { ...attrData, inputValue: newListValue } };
    });
  };
  const handleAddListItem = (attrKey: string) => {
    /* ... same ... */
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormAttributeState;
      const newListValue = [...(attrData.inputValue as string[]), ""];
      return { ...prev, [attrKey]: { ...attrData, inputValue: newListValue } };
    });
  };
  const handleRemoveListItem = (attrKey: string, index: number) => {
    /* ... same ... */
    setFormData((prev) => {
      const attrData = prev[attrKey] as FormAttributeState;
      const newListValue = (attrData.inputValue as string[]).filter(
        (_, i) => i !== index,
      );
      return { ...prev, [attrKey]: { ...attrData, inputValue: newListValue } };
    });
  };

  const validateForm = (): boolean => {
    /* ... same validation logic ... */
    const errors: Record<string, string | null> = {};
    const currentName = (formData.name as string)?.trim();
    if (!currentName) errors.name = "Name is required";
    // Note: Name uniqueness check might need to consider category if names are not globally unique per type.
    // For now, assume name is unique per type across categories.
    if (entityTypeInfo?.attributes) {
      Object.entries(entityTypeInfo.attributes).forEach(([key, attrSchema]) => {
        const formAttrState = formData[key] as FormAttributeState;
        if (!formAttrState) return;
        if (attrSchema.required) {
          let valueIsEmpty = false;
          const inputValue = formAttrState.inputValue;

          if (
            inputValue === undefined ||
            inputValue === null ||
            String(inputValue).trim() === ""
          ) {
            valueIsEmpty = true;
          }
          if (Array.isArray(inputValue) && inputValue.length === 0) {
            valueIsEmpty = true;
          }
          if (attrSchema.type === "boolean" && inputValue === undefined) {
            valueIsEmpty = true;
          }

          if (valueIsEmpty) {
            errors[key] = `${attrSchema.label || key} is required.`;
          }
        }

        if (
          formAttrState.uiMode === "datetime_picker" &&
          formAttrState.inputValue &&
          !formAttrState.hyExpression
        )
          errors[key] = `Invalid date/time for ${attrSchema.label || key}.`;
        if (
          attrSchema.type === "integer" &&
          formAttrState.inputValue &&
          !/^-?\d+$/.test(String(formAttrState.inputValue))
        )
          errors[key] = `${attrSchema.label || key} must be an integer.`;
        if (
          attrSchema.type === "decimal" &&
          formAttrState.inputValue &&
          isNaN(parseFloat(String(formAttrState.inputValue)))
        )
          errors[key] = `${attrSchema.label || key} must be a decimal.`;
      });
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !entityTypeInfo) return;
    setIsSubmitting(true);
    setFormErrors((prev) => ({ ...prev, _submission: null }));

    const entityName = (formData.name as string).trim();
    const entityCategory =
      (formData.category as FormAttributeState)?.inputValue ||
      (formData.category as string) ||
      selectedCategoryOnOpen;

    const attributesRawForCreate: Record<string, any> = {};
    let formHasErrors = false;

    Object.entries(formData).forEach(([attrKey, formAttrStateUntyped]) => {
      if (attrKey === "name" || attrKey === "category" || formHasErrors) return;
      const formAttrState = formAttrStateUntyped as FormAttributeState;
      const attrSchema = entityTypeInfo.attributes[attrKey];
      if (!attrSchema) return;
      let valueForApi: any;
      let isDynamicForApi = false;
      let originalForApi: string | undefined = undefined;
      // --- Logic to derive valueForApi, isDynamicForApi, originalForApi (same as EntityDetail) ---
      switch (
        formAttrState.uiMode /* ... same switch as in EntityDetail.tsx ... */
      ) {
        case "datetime_picker":
          if (formAttrState.inputValue && formAttrState.hyExpression) {
            try {
              valueForApi = new Date(
                formAttrState.inputValue as string,
              ).toISOString();
              originalForApi = formAttrState.hyExpression;
              isDynamicForApi = true;
            } catch (e) {
              setFormErrors((prev) => ({ ...prev, [attrKey]: "Invalid date" }));
              formHasErrors = true;
              return;
            }
          } else if (attrSchema.required) {
            setFormErrors((prev) => ({ ...prev, [attrKey]: "Required" }));
            formHasErrors = true;
            return;
          } else {
            valueForApi = null;
          }
          break;
        case "code_editor":
          valueForApi = formAttrState.inputValue as string;
          if (
            typeof valueForApi === "string" &&
            valueForApi.trim().startsWith("(")
          ) {
            isDynamicForApi = true;
            originalForApi = valueForApi;
          } else {
            isDynamicForApi = false;
          }
          break;
        case "list_editor":
          valueForApi = formAttrState.inputValue as string[];
          break;
        case "boolean_select":
          valueForApi =
            formAttrState.inputValue === "true"
              ? true
              : formAttrState.inputValue === "false"
                ? false
                : null;
          if (valueForApi === null && attrSchema.required) valueForApi = false;
          break;
        case "enum_select":
          valueForApi = formAttrState.inputValue as string;
          if (valueForApi === "" && !attrSchema.required) valueForApi = null;
          break;
        default:
          valueForApi = formAttrState.inputValue;
          if (attrSchema.type === "integer") {
            const intVal = parseInt(String(valueForApi), 10);
            valueForApi = isNaN(intVal)
              ? attrSchema.required
                ? 0
                : null
              : intVal;
          } else if (attrSchema.type === "decimal") {
            const floatVal = parseFloat(String(valueForApi));
            valueForApi = isNaN(floatVal)
              ? attrSchema.required
                ? 0.0
                : null
              : floatVal;
          } else if (valueForApi === "" && !attrSchema.required) {
            valueForApi = null;
          }
      }
      if (formHasErrors) return;
      if (dialogMode === "create") {
        attributesRawForCreate[attrKey] = isDynamicForApi
          ? originalForApi
          : valueForApi;
      }
    });

    if (formHasErrors) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (dialogMode === "create") {
        const payload: CreateEntityPayload = {
          name: entityName,
          entity_type: entityTypeInfo.name,
          category: entityCategory,
          attributes_raw: attributesRawForCreate,
        };
        await entitiesApi.createEntity(payload);
      } else if (dialogMode === "edit" && currentEntity) {
        if (entityName !== currentEntity.name) {
          await entitiesApi.renameEntity(
            entityTypeInfo.name,
            currentEntity.name,
            entityName,
          );
        }
        // Category change (if UI allows it)
        const currentCategoryInForm =
          (formData.category as FormAttributeState)?.inputValue ||
          (formData.category as string);
        if (
          currentCategoryInForm &&
          currentCategoryInForm !== currentEntity.category
        ) {
          await entitiesApi.moveEntityToCategory(
            entityTypeInfo.name,
            entityName,
            currentCategoryInForm,
          );
        }

        for (const attrKey of Object.keys(entityTypeInfo.attributes)) {
          const formAttrState = formData[attrKey] as FormAttributeState;
          const attrSchema = entityTypeInfo.attributes[attrKey];
          let valueForApi: any;
          let isDynamicForApi = false;
          let originalForApi: string | undefined = undefined;
          // --- Re-run switch logic for THIS specific attribute for update ---
          switch (formAttrState.uiMode /* ... Same switch as above ... */) {
            case "datetime_picker":
              if (formAttrState.inputValue && formAttrState.hyExpression) {
                try {
                  valueForApi = new Date(
                    formAttrState.inputValue as string,
                  ).toISOString();
                  originalForApi = formAttrState.hyExpression;
                  isDynamicForApi = true;
                } catch (e) {
                  formHasErrors = true;
                  break;
                }
              } else {
                valueForApi = null;
              }
              break;
            case "code_editor":
              valueForApi = formAttrState.inputValue as string;
              if (
                typeof valueForApi === "string" &&
                valueForApi.trim().startsWith("(")
              ) {
                isDynamicForApi = true;
                originalForApi = valueForApi;
              }
              break;
            case "list_editor":
              valueForApi = formAttrState.inputValue as string[];
              break;
            case "boolean_select":
              valueForApi =
                formAttrState.inputValue === "true"
                  ? true
                  : formAttrState.inputValue === "false"
                    ? false
                    : null;
              if (valueForApi === null && attrSchema.required)
                valueForApi = false;
              break;
            case "enum_select":
              valueForApi = formAttrState.inputValue as string;
              if (valueForApi === "" && !attrSchema.required)
                valueForApi = null;
              break;
            default:
              valueForApi = formAttrState.inputValue;
              if (attrSchema.type === "integer") {
                const intVal = parseInt(String(valueForApi), 10);
                valueForApi = isNaN(intVal) ? null : intVal;
              } else if (attrSchema.type === "decimal") {
                const floatVal = parseFloat(String(valueForApi));
                valueForApi = isNaN(floatVal) ? null : floatVal;
              } else if (valueForApi === "" && !attrSchema.required) {
                valueForApi = null;
              }
          }
          if (formHasErrors) {
            setFormErrors((prev) => ({
              ...prev,
              [attrKey]: "Error processing value",
            }));
            continue;
          }

          const originalAttributeSTV = currentEntity.attributes[attrKey];
          let changed = !originalAttributeSTV; // If attribute is new, it's changed
          if (originalAttributeSTV) {
            if (isDynamicForApi) {
              changed =
                originalAttributeSTV.original !== originalForApi ||
                originalAttributeSTV.value !== valueForApi;
            } else {
              changed =
                originalAttributeSTV.value !== valueForApi ||
                originalAttributeSTV.is_dynamic;
            }
          }
          if (changed) {
            const updatePayload: UpdateAttributePayload = {
              value: valueForApi,
              is_dynamic: isDynamicForApi,
              original: originalForApi,
            };
            await entitiesApi.updateEntityAttribute(
              entityTypeInfo.name,
              entityName,
              attrKey,
              updatePayload,
            );
          }
        }
      }
      onSaveSuccess(); // Call parent callback to refresh data
      onClose(); // Close dialog
    } catch (err: any) {
      console.error("Error saving entity:", err);
      const errorDetail =
        err.response?.data?.detail || err.message || "Unknown error";
      setFormErrors((prev) => ({
        ...prev,
        _submission: `Failed to save: ${errorDetail}`,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // renderDialogFields - same as in EntityDetail.tsx (response #19)
  const renderDialogFields = () => {
    /* ... copy from response #19, ensure keys for list items ... */
    if (!entityTypeInfo?.attributes) return null;
    return Object.entries(entityTypeInfo.attributes).map(
      ([attrKey, attrSchema]) => {
        const formAttrState = formData[attrKey] as FormAttributeState;
        const errorText = formErrors[attrKey];
        if (!formAttrState)
          return <CircularProgress key={attrKey} size={20} sx={{ m: 1 }} />;
        switch (formAttrState.uiMode) {
          case "datetime_picker":
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={attrSchema.label || attrKey}
                type="datetime-local"
                fullWidth
                value={formAttrState.inputValue || ""}
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={
                  errorText || (attrSchema.required ? "Required" : "")
                }
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            );
          case "code_editor":
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={`${attrSchema.label || attrKey} (Hy Code/Expr)`}
                type="text"
                multiline
                rows={3}
                fullWidth
                value={formAttrState.inputValue || ""}
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={
                  errorText || (attrSchema.required ? "Required" : "")
                }
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
                  {attrSchema.label || attrKey} {attrSchema.required ? "*" : ""}
                </Typography>
                {(formAttrState.inputValue as string[]).map((item, index) => (
                  <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    key={`${attrKey}-dlg-item-${index}`}
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
                  {attrSchema.label || attrKey}
                </InputLabel>
                <Select
                  labelId={`${attrKey}-label`}
                  value={String(formAttrState.inputValue ?? "")}
                  label={attrSchema.label || attrKey}
                  onChange={(e) =>
                    handleFormInputChange(attrKey, e.target.value)
                  }
                >
                  {!attrSchema.required && (
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                  )}
                  {(attrSchema.enum_choices || []).map((choice) => (
                    <MenuItem key={choice} value={choice}>
                      {choice}
                    </MenuItem>
                  ))}
                </Select>
                {errorText && <FormHelperText>{errorText}</FormHelperText>}
                {!errorText && attrSchema.required && (
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
                  {attrSchema.label || attrKey}
                </InputLabel>
                <Select
                  labelId={`${attrKey}-label`}
                  value={String(formAttrState.inputValue ?? "false")}
                  label={attrSchema.label || attrKey}
                  onChange={(e) =>
                    handleFormInputChange(attrKey, e.target.value)
                  }
                >
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                  {!attrSchema.required && (
                    <MenuItem value="">
                      <em>(not set)</em>
                    </MenuItem>
                  )}
                </Select>
                {errorText && <FormHelperText>{errorText}</FormHelperText>}
                {!errorText && attrSchema.required && (
                  <FormHelperText>Required</FormHelperText>
                )}
              </FormControl>
            );
          default:
            return (
              <TextField
                key={attrKey}
                margin="dense"
                label={attrSchema.label || attrKey}
                type={
                  attrSchema.type === "integer" || attrSchema.type === "decimal"
                    ? "number"
                    : "text"
                }
                fullWidth
                value={formAttrState.inputValue || ""}
                onChange={(e) => handleFormInputChange(attrKey, e.target.value)}
                error={!!errorText}
                helperText={
                  errorText || (attrSchema.required ? "Required" : "")
                }
                sx={{ mb: 2 }}
                InputProps={
                  attrSchema.type === "decimal" ? { step: "any" } : {}
                }
              />
            );
        }
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          helperText={formErrors.name || "Unique identifier. Required."}
          sx={{ mb: 2 }}
        />
        {/* Category selection for create mode, display for edit (can be made editable) */}
        {dialogMode === "create" && (
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="entity-category-label">Category</InputLabel>
            <Select
              labelId="entity-category-label"
              label="Category"
              value={
                (formData.category as FormAttributeState)?.inputValue ||
                formData.category ||
                selectedCategoryOnOpen
              }
              onChange={(e) =>
                handleFormInputChange("category", e.target.value)
              }
            >
              {/* Populate this with available categories later, for now uses selectedCategoryOnOpen */}
              <MenuItem value={selectedCategoryOnOpen}>
                {selectedCategoryOnOpen === DEFAULT_CATEGORY
                  ? "Default"
                  : selectedCategoryOnOpen}
              </MenuItem>
              {/* Add other categories if user should choose during creation */}
            </Select>
          </FormControl>
        )}
        {dialogMode === "edit" && currentEntity && (
          <TextField
            margin="dense"
            label="Category"
            fullWidth
            value={currentEntity.category}
            disabled
            sx={{ mb: 2 }}
          />
          // TODO: Add UI to change category for an existing entity via moveEntityToCategory
        )}

        {renderDialogFields()}
        {formErrors._submission && (
          <Typography color="error" sx={{ mt: 2 }}>
            {formErrors._submission}
          </Typography>
        )}
        {isSubmitting && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {dialogMode === "create" ? "Create" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
