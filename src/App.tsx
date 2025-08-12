import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Layout } from "./components/layout/Layout/Layout";
import { Variables } from "./pages/Variables/Variables";
import { Config } from "./pages/Config/Config";
import { Units } from "./pages/Units/Units";
import { Anchors } from "./pages/Anchors/Anchors";
import { Resolve } from "./pages/Resolve/Resolve";
import { Anchor } from "./types/anchors";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Entities } from "./pages/Entities/Entities";
import { EntityDetail } from "./pages/Entities/EntityDetail";
import { PatternManagerPage } from "./pages/Patterns/PatternManagerPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <Layout activePage="dashboard">
              <Dashboard />
            </Layout>
          }
        />

        <Route
          path="/variables"
          element={
            <Layout activePage="variables">
              <Variables />
            </Layout>
          }
        />

        <Route
          path="/config"
          element={
            <Layout activePage="config">
              <Config />
            </Layout>
          }
        />

        <Route
          path="/units"
          element={
            <Layout activePage="units">
              <Units />
            </Layout>
          }
        />

        <Route
          path="/anchors"
          element={
            <Layout activePage="anchors">
              <Anchors />
            </Layout>
          }
        />
        {/* Main entities route */}
        <Route
          path="/entities"
          element={
            <Layout activePage="entities">
              <Entities />
            </Layout>
          }
        />

        {/* Dynamic route for entity types */}
        <Route
          path="/entities/:entityType"
          element={
            <Layout activePage="entities">
              <EntityDetail />
            </Layout>
          }
        />

        <Route
          path="/patterns"
          element={
            <Layout activePage="patterns">
              <PatternManagerPage />
            </Layout>
          }
        />

        <Route
          path="/clock"
          element={
            <Layout activePage="clock">
              <div>Clock Page (Coming Soon)</div>
            </Layout>
          }
        />

        <Route
          path="/calendar"
          element={
            <Layout activePage="calendar">
              <div>Calendar Page (Coming Soon)</div>
            </Layout>
          }
        />

        <Route
          path="/resolve"
          element={
            <Layout activePage="resolve">
              <Resolve />
            </Layout>
          }
        />

        <Route
          path="/events"
          element={
            <Layout activePage="events">
              <div>Events Page (Coming Soon)</div>
            </Layout>
          }
        />

        <Route
          path="/analytics"
          element={
            <Layout activePage="analytics">
              <div>Analytics Page (Coming Soon)</div>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
