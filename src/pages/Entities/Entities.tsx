import React, { useState, useEffect } from "react";
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

export const Entities: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntityTypes = async () => {
      try {
        setLoading(true);
        const types = await entitiesApi.getEntityTypes();
        console.log("entities.types=", types);
        setEntityTypes(types);
        setError(null);
      } catch (err) {
        console.error("Error fetching entity types:", err);
        setError("Failed to load entity types. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntityTypes();
  }, []);

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
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <div>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Entities
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your time entities like tasks, habits, events, and more.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {entityTypes.map((type) => (
          <Grid item xs={12} sm={6} md={4} key={type.name}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  {type.name.charAt(0).toUpperCase() + type.name.slice(1)}s
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {Object.keys(type.attributes).length} attributes defined
                </Typography>
                <Box mt={2}>
                  <Button
                    component={Link}
                    to={`/entities/${type.name}`}
                    variant="contained"
                    color="primary"
                  >
                    View {type.name}s
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};
