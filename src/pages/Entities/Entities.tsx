import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import { entitiesApi } from "../../api/entitiesApi";
// Import the new types
import { EntityTypeDetail, EntityTypeDetailList } from "../../types/entities"; // Changed any[] to EntityTypeDetailList

export const Entities: React.FC = () => {
  // Use the specific type for state
  const [entityTypes, setEntityTypes] = useState<EntityTypeDetailList>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntityTypes = useCallback(async () => {
    // Encapsulate fetching logic in useCallback
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const types: EntityTypeDetailList = await entitiesApi.getEntityTypes();
      console.log("Fetched entity types:", types); // Keep for debugging
      setEntityTypes(types);
    } catch (err) {
      console.error("Error fetching entity types:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(
        `Failed to load entity types: ${errorMessage}. Please try again later.`,
      );
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  useEffect(() => {
    fetchEntityTypes();
  }, [fetchEntityTypes]); // Depend on the memoized fetchEntityTypes

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px" // Or a larger portion of the viewport height e.g. "80vh"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Entity Types...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} textAlign="center">
        {" "}
        {/* Added textAlign for better error display */}
        <Typography color="error" variant="h6">
          {error}
        </Typography>{" "}
        {/* Made error more prominent */}
        <Button variant="contained" onClick={fetchEntityTypes} sx={{ mt: 2 }}>
          {" "}
          {/* Use fetchEntityTypes for retry */}
          Retry
        </Button>
      </Box>
    );
  }

  if (entityTypes.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6">No entity types found.</Typography>
        <Typography variant="body1" color="textSecondary">
          You might need to define entity types in your backend configuration
          (e.g., <code>entity_types.hy</code>).
        </Typography>
        <Button variant="outlined" onClick={fetchEntityTypes} sx={{ mt: 2 }}>
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {" "}
      {/* Added padding to the main container */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {" "}
          {/* Use component="h1" for semantic heading */}
          Entity Types
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Select an entity type to view and manage its instances.
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {entityTypes.map(
          (
            type: EntityTypeDetail, // Explicitly type 'type' here
          ) => (
            <Grid item xs={12} sm={6} md={4} key={type.name}>
              {" "}
              {/* Use type.name (lowercase key) as key */}
              <Card
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {" "}
                {/* Added elevation and flex for consistent height */}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {/* Use displayName for display, fallback to capitalized name */}
                    {type.displayName ||
                      type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                    s
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {Object.keys(type.attributes).length} attribute
                    {Object.keys(type.attributes).length !== 1 ? "s" : ""}{" "}
                    defined.
                  </Typography>
                  <Box mt={2}>
                    <Button
                      component={Link}
                      to={`/entities/${type.name}`} // Link uses the lowercase 'name' key
                      variant="contained"
                      color="primary"
                      fullWidth // Make button take full card width for better clickability
                    >
                      View {type.displayName || type.name}s
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ),
        )}
      </Grid>
    </Box>
  );
};
