import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Entity as EntityInstance,
  EntityTypeDetail,
  SerializedTypedValue,
} from "../../types/entities";
import { DEFAULT_CATEGORY } from "../../constants"; // Import from new constants file

interface EntityTableProps {
  entities: EntityInstance[];
  entityTypeInfo: EntityTypeDetail;
  onEdit: (entity: EntityInstance) => void;
  onDelete: (entityName: string, entityCategory: string) => void; // Pass category for precise deletion
  isLoading?: boolean;
}

export const EntityTable: React.FC<EntityTableProps> = ({
  entities,
  entityTypeInfo,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const renderAttributeValue = (
    attrKey: string,
    sTypedValue?: SerializedTypedValue,
  ): React.ReactNode => {
    // ... (same as response #19, ensure keys in list mapping are good)
    if (!entityTypeInfo) return "N/A";
    const attrSchema = entityTypeInfo.attributes[attrKey];
    if (!attrSchema || !sTypedValue)
      return (
        <Typography variant="caption">
          <em>(not set)</em>
        </Typography>
      );
    const { value, is_dynamic, original, type: actualValueType } = sTypedValue;
    const displayType = attrSchema.type;
    if (
      displayType === "datetime" ||
      displayType === "timestamp" ||
      (is_dynamic &&
        actualValueType === "code" &&
        original?.trim().startsWith("(datetime "))
    ) {
      try {
        if (value === null || value === undefined)
          return (
            <Typography variant="caption">
              <em>(not set)</em>
            </Typography>
          );
        return new Date(value as string).toLocaleString();
      } catch {
        return (
          <Typography color="error" variant="caption">
            Invalid Date
          </Typography>
        );
      }
    }
    if (is_dynamic && original) {
      return (
        <Tooltip title={`Original: ${original}`} placement="top-start">
          <Box>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: "text.secondary", fontStyle: "italic" }}
            >
              dynamic ({actualValueType})
            </Typography>
            <Typography variant="body2" component="span">
              → {String(value ?? "N/A")}
            </Typography>
          </Box>
        </Tooltip>
      );
    }
    if (displayType === "list" && Array.isArray(value)) {
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
            maxHeight: 70,
            overflowY: "auto",
            bgcolor: "action.hover",
            borderRadius: 1,
            p: 0.5,
          }}
        >
          {value.map((item, index) => (
            <ListItem
              key={`${attrKey}-item-${index}-${String(item)}`}
              dense
              disableGutters
              sx={{ pl: 0.5, pr: 0.5, pt: 0, pb: 0 }}
            >
              <ListItemText
                primaryTypographyProps={{ variant: "caption" }}
                primary={String(item)}
              />
            </ListItem>
          ))}
        </List>
      );
    }
    if (displayType === "boolean") {
      return value === true ? (
        "Yes"
      ) : value === false ? (
        "No"
      ) : (
        <Typography variant="caption">
          <em>(not set)</em>
        </Typography>
      );
    }
    if (displayType === "code") {
      return <code>{String(value ?? "")}</code>;
    }
    if (value === null || value === undefined)
      return (
        <Typography variant="caption">
          <em>(not set)</em>
        </Typography>
      );
    return String(value);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  // This condition is now handled by the parent (EntityDetail) before rendering EntityTable
  // if (entities.length === 0) {
  //   return <Typography sx={{ my: 2, textAlign: 'center' }}>No entities found for the selected criteria.</Typography>;
  // }

  return (
    <Paper elevation={1} sx={{ mb: 2 }}>
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Category</TableCell>

              {Object.entries(entityTypeInfo.attributes).map(
                ([attrKey, attrDef]) => (
                  <TableCell key={attrKey} sx={{ fontWeight: "bold" }}>
                    {attrDef.label || attrKey}
                  </TableCell>
                ),
              )}

              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entities.map((entity) => (
              // Key includes category for uniqueness if names can repeat across categories
              <TableRow
                hover
                key={`${entity.entity_type}-${entity.category}-${entity.name}`}
              >
                <TableCell
                  component="th"
                  scope="row"
                  sx={{ fontWeight: "medium" }}
                >
                  {entity.name}
                </TableCell>
                <TableCell>
                  {entity.category === DEFAULT_CATEGORY
                    ? "Default"
                    : entity.category.charAt(0).toUpperCase() +
                      entity.category.slice(1)}
                </TableCell>
                {Object.keys(entityTypeInfo.attributes).map((attrKey) => (
                  // Key is good here
                  <TableCell key={attrKey}>
                    {renderAttributeValue(attrKey, entity.attributes[attrKey])}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <IconButton
                    onClick={() => onEdit(entity)}
                    size="small"
                    title={`Edit ${entity.name}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {/* Pass category to onDelete handler */}
                  <IconButton
                    onClick={() => onDelete(entity.name, entity.category)}
                    size="small"
                    color="error"
                    title={`Delete ${entity.name}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
