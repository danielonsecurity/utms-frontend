interface EntityAttributeFieldProps {
  attributeKey: string;
  attributeDefinition: AttributeSchema; // { label: string, type: "string" | "integer" | "code" | "boolean", ... }
  currentValue: any; // The resolved value from entity.attributes[attributeKey]
  originalExpression?: string; // From entity.dynamic_fields[attributeKey].original
  formData: any; // The relevant part of the form's state for this field
  onFormDataChange: (fieldName: string, newValue: any) => void; // To update parent form state
  // ... other props like formErrors
}

const EntityAttributeField: React.FC<EntityAttributeFieldProps> = ({
  attributeKey,
  attributeDefinition,
  currentValue, // This is the resolved value, e.g., ISO string for datetime
  originalExpression, // This is the (datetime ...) or other Hy code
  formData, // Let's say formData[attributeKey] holds { displayValue: string, hyCode: string, uiMode: 'datetime' | 'code' }
  onFormDataChange,
}) => {
  const [uiMode, setUiMode] = useState<"datetime" | "code" | "default">(
    "default",
  );
  // displayValue would be for datetime-local input, textarea for code, or simple input
  const [displayValue, setDisplayValue] = useState("");
  // hyCode would be the (datetime Y M D H M S) or other expression
  const [hyCode, setHyCode] = useState("");

  useEffect(() => {
    const attrType = attributeDefinition.type;
    // Heuristic from ConfigCard: if type is "code" and originalExpression starts with "(datetime "
    // OR if type is "timestamp" (if you decide "timestamp" attributes should also use this Hy-code-gen)
    const isChronoCandidate =
      attrType === "code" &&
      originalExpression?.trim().startsWith("(datetime ");
    // Or: const isChronoCandidate = attributeDefinition.widget === 'datetime_hy_generator';

    if (isChronoCandidate) {
      setUiMode("datetime");
      // currentValue is the ISO string from backend (resolved value of (datetime...))
      setDisplayValue(formatUtcIsoToLocalInput(currentValue)); // Like in ConfigCard
      setHyCode(originalExpression || ""); // Use existing Hy code
      // Update parent form state
      onFormDataChange(attributeKey, {
        displayValue: formatUtcIsoToLocalInput(currentValue),
        hyCode: originalExpression || "",
        type: "chrono_datetime_internal",
      });
    } else if (attrType === "code") {
      setUiMode("code");
      // currentValue might be the resolved value of other code, or the code itself if not dynamic
      // originalExpression is the source of truth for the textarea
      setDisplayValue(originalExpression || String(currentValue || "")); // For textarea
      setHyCode(originalExpression || String(currentValue || ""));
      onFormDataChange(attributeKey, {
        displayValue: originalExpression || String(currentValue || ""),
        hyCode: originalExpression || String(currentValue || ""),
        type: "generic_code_internal",
      });
    } else if (attrType === "boolean") {
      // ...
      setDisplayValue(String(currentValue ?? false));
      onFormDataChange(attributeKey, String(currentValue ?? false));
    }
    // ... other types: integer, string
    else {
      setUiMode("default");
      setDisplayValue(String(currentValue ?? ""));
      onFormDataChange(attributeKey, String(currentValue ?? ""));
    }
  }, [
    attributeKey,
    attributeDefinition,
    currentValue,
    originalExpression /*, onFormDataChange (careful with dep array) */,
  ]);

  const handleDateTimeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const localDateTimeStr = e.target.value;
    const newHyCode = generateHyDateTimeCode(localDateTimeStr); // From ConfigCard
    setDisplayValue(localDateTimeStr);
    setHyCode(newHyCode || "");
    onFormDataChange(attributeKey, {
      displayValue: localDateTimeStr,
      hyCode: newHyCode || "",
      type: "chrono_datetime_internal",
    });
  };

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setDisplayValue(newCode); // Textarea shows the code directly
    setHyCode(newCode);
    onFormDataChange(attributeKey, {
      displayValue: newCode,
      hyCode: newCode,
      type: "generic_code_internal",
    });
  };

  // ... handleBooleanChange, handleStringChange, handleIntegerChange etc.

  // RENDER LOGIC based on attributeDefinition.type and uiMode
  if (uiMode === "datetime") {
    return (
      <TextField
        type="datetime-local"
        value={displayValue}
        onChange={handleDateTimeInputChange} /* ... */
      />
    );
  } else if (uiMode === "code") {
    return (
      <TextField
        multiline
        value={displayValue /* which is hyCode here */}
        onChange={handleCodeInputChange} /* ... */
      />
      // Potentially a button to toggle to datetime picker if it was originally a datetime code?
      // ConfigCard has a select to change type, which implies changing uiMode
    );
  } else if (attributeDefinition.type === "boolean") {
    // ... select true/false
  } else {
    // string, integer
    // ... regular TextField
  }
  return <></>; // Fallback
};
