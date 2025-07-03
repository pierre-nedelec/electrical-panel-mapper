// src/components/TemplateSelector.js
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button,
  Box
} from '@mui/material';
import { floorPlanTemplates } from '../templates/floorPlanTemplates';

const TemplateSelector = ({ open, onClose, onSelectTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Choose a Floor Plan Template</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select a template to start with, or choose a blank canvas to draw your own floor plan.
        </Typography>
        <Grid container spacing={2}>
          {floorPlanTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedTemplate?.id === template.id ? 2 : 1,
                  borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider'
                }}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent>
                  <Box 
                    sx={{ 
                      height: 120, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 2
                    }}
                  >
                    <svg 
                      viewBox={template.viewBox} 
                      style={{ width: '100%', height: '100%' }}
                      dangerouslySetInnerHTML={{ __html: template.svg }}
                    />
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {template.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleSelect} 
          color="primary" 
          variant="contained"
          disabled={!selectedTemplate}
        >
          Use This Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateSelector;
