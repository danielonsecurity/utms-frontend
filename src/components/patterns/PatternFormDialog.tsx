// src/components/patterns/PatternFormDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Grid,
  Box,
} from "@mui/material";
import { Pattern } from "../../types/patterns";
import { patternsApi } from "../../api/patternsApi";

interface PatternFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  existingPattern: Pattern | null;
}

const emptyPattern: Pattern = {
  label: "",
  name: "",
  every: "",
  at: [],
  on: [],
};

export const PatternFormDialog: React.FC<PatternFormDialogProps> = ({
  open,
  onClose,
  onSaveSuccess,
  existingPattern,
}) => {
  const [formData, setFormData] = useState<Pattern>(
    existingPattern || emptyPattern,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(existingPattern || emptyPattern);
  }, [existingPattern, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Basic change handler, needs to be more complex for 'at' and 'on'
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Here you'd need logic to parse the form fields back into the correct JSON structure for the API
      // For example, splitting a comma-separated string for 'at' or 'on'

      // This is a simplified submission
      const payload = { ...formData };
      // TODO: Add robust parsing of form fields before sending

      if (existingPattern) {
        // await patternsApi.updatePattern(existingPattern.label, payload);
        console.log("Update not implemented yet");
      } else {
        await patternsApi.createPattern(payload);
      }
      onSaveSuccess();
    } catch (error) {
      console.error("Failed to save pattern:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingPattern ? "Edit Pattern" : "Create New Pattern"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="label"
              label="Label (Unique ID)"
              value={formData.label}
              onChange={handleChange}
              fullWidth
              required
              disabled={!!existingPattern}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Display Name"
              value={formData.name || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="every"
              label="Every (e.g., '1d', '2 hours')"
              value={formData.every}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          {/* Add more complex fields for 'at', 'on', 'between', etc. */}
          {/* Example for a simple comma-separated 'at' */}
          <Grid item xs={12}>
            <TextField
              name="at"
              label="At (comma-separated, e.g., 10:00,14:00 or [:minute,25])"
              value={Array.isArray(formData.at) ? formData.at.join(",") : ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  at: e.target.value.split(","),
                }))
              }
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSubmitting}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
