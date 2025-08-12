// src/pages/Patterns/PatternManagerPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

import { patternsApi } from "../../api/patternsApi";
import { Pattern } from "../../types/patterns";
import { PatternTimeline } from "../../components/patterns/PatternTimeline";
import { PatternFormDialog } from "../../components/patterns/PatternFormDialog";

export const PatternManagerPage: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPatterns = await patternsApi.getPatterns();
      setPatterns(fetchedPatterns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patterns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditPattern = (patternLabel: string) => {
    const patternToEdit = patterns.find((p) => p.label === patternLabel);
    if (patternToEdit) {
      setEditingPattern(patternToEdit);
      setIsFormOpen(true);
    }
  };

  const handleCreatePattern = () => {
    setEditingPattern(null);
    setIsFormOpen(true);
  };

  const handleSaveSuccess = () => {
    setIsFormOpen(false);
    fetchData(); // Refetch all data on success
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4">Recurrence Patterns</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePattern}
        >
          New Pattern
        </Button>
      </Box>

      <PatternTimeline onEventClick={handleEditPattern} />

      {isFormOpen && (
        <PatternFormDialog
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaveSuccess={handleSaveSuccess}
          existingPattern={editingPattern}
        />
      )}
    </Box>
  );
};
