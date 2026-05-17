/**
 * Templates — Built-in process map templates
 */
(function () {
    'use strict';

    const templates = {
        'it-support': {
            name: 'IT Support Workflow',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-user', name: 'End User', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-helpdesk', name: 'Help Desk', backgroundColor: '', borderColor: '', fontColor: '', order: 1 },
                    { id: 'lane-l2', name: 'L2 Support', backgroundColor: '', borderColor: '', fontColor: '', order: 2 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Submit Ticket', description: 'User submits support ticket', shapeType: 'start', swimlane: 'lane-user', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '' },
                    { stepId: 'S2', stepName: 'Triage Ticket', description: 'Classify and prioritize', shapeType: 'process', swimlane: 'lane-helpdesk', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '' },
                    { stepId: 'S3', stepName: 'Can Resolve?', description: 'Is this L1 resolvable?', shapeType: 'decision', swimlane: 'lane-helpdesk', nextStep: '', yesPath: 'S4', noPath: 'S5', backgroundColor: '#ffffff', fontColor: '#d97706', borderColor: '#d97706', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '' },
                    { stepId: 'S4', stepName: 'Resolve Issue', description: 'Apply fix', shapeType: 'process', swimlane: 'lane-helpdesk', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '' },
                    { stepId: 'S5', stepName: 'Escalate to L2', description: 'Escalate complex issue', shapeType: 'process', swimlane: 'lane-l2', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#7c3aed', borderColor: '#7c3aed', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '' },
                    { stepId: 'S6', stepName: 'Close Ticket', description: 'Mark as resolved', shapeType: 'end', swimlane: 'lane-user', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '' }
                ],
                edges: []
            }
        },
        'approval': {
            name: 'Approval Process',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-req', name: 'Requester', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-mgr', name: 'Manager', backgroundColor: '', borderColor: '', fontColor: '', order: 1 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Submit Request', shapeType: 'start', swimlane: 'lane-req', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 50, icon: '', notes: '', description: '' },
                    { stepId: 'S2', stepName: 'Review Request', shapeType: 'process', swimlane: 'lane-mgr', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Approved?', shapeType: 'decision', swimlane: 'lane-mgr', nextStep: '', yesPath: 'S4', noPath: 'S5', backgroundColor: '#ffffff', fontColor: '#d97706', borderColor: '#d97706', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Process Approved', shapeType: 'process', swimlane: 'lane-req', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Notify Rejection', shapeType: 'process', swimlane: 'lane-req', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S6', stepName: 'End', shapeType: 'end', swimlane: 'lane-req', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        },
        'bug-tracking': {
            name: 'Bug Tracking Workflow',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-qa', name: 'QA Team', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-dev', name: 'Development', backgroundColor: '', borderColor: '', fontColor: '', order: 1 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Bug Reported', shapeType: 'start', swimlane: 'lane-qa', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 50, icon: '', notes: '', description: '' },
                    { stepId: 'S2', stepName: 'Reproduce Bug', shapeType: 'process', swimlane: 'lane-qa', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Assign to Dev', shapeType: 'process', swimlane: 'lane-dev', nextStep: 'S4', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#2563eb', borderColor: '#2563eb', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Fix Bug', shapeType: 'process', swimlane: 'lane-dev', nextStep: 'S5', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Fix Verified?', shapeType: 'decision', swimlane: 'lane-qa', nextStep: '', yesPath: 'S6', noPath: 'S4', backgroundColor: '#ffffff', fontColor: '#d97706', borderColor: '#d97706', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S6', stepName: 'Close Bug', shapeType: 'end', swimlane: 'lane-qa', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        },
        'employee-onboarding': {
            name: 'Employee Onboarding',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-hr', name: 'HR', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-it', name: 'IT', backgroundColor: '', borderColor: '', fontColor: '', order: 1 },
                    { id: 'lane-mgr', name: 'Manager', backgroundColor: '', borderColor: '', fontColor: '', order: 2 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Offer Accepted', shapeType: 'start', swimlane: 'lane-hr', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 50, icon: '', notes: '', description: '' },
                    { stepId: 'S2', stepName: 'Setup Accounts', shapeType: 'process', swimlane: 'lane-it', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#2563eb', borderColor: '#2563eb', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Prepare Workspace', shapeType: 'process', swimlane: 'lane-mgr', nextStep: 'S4', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 160, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Orientation Day', shapeType: 'process', swimlane: 'lane-hr', nextStep: 'S5', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Onboarding Complete', shapeType: 'end', swimlane: 'lane-hr', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 160, height: 50, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        },
        'purchase-approval': {
            name: 'Purchase Approval',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-emp', name: 'Employee', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-fin', name: 'Finance', backgroundColor: '', borderColor: '', fontColor: '', order: 1 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Create PO', shapeType: 'start', swimlane: 'lane-emp', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' },
                    { stepId: 'S2', stepName: 'Enter Details', shapeType: 'manualInput', swimlane: 'lane-emp', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#0891b2', borderColor: '#0891b2', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Budget Check', shapeType: 'decision', swimlane: 'lane-fin', nextStep: '', yesPath: 'S4', noPath: 'S5', backgroundColor: '#ffffff', fontColor: '#d97706', borderColor: '#d97706', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Approved', shapeType: 'document', swimlane: 'lane-fin', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#2563eb', borderColor: '#2563eb', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 70, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Rejected', shapeType: 'process', swimlane: 'lane-emp', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S6', stepName: 'End', shapeType: 'end', swimlane: 'lane-emp', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        },
        'change-management': {
            name: 'Change Management',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-req', name: 'Requester', backgroundColor: '', borderColor: '', fontColor: '', order: 0 },
                    { id: 'lane-cab', name: 'Change Advisory Board', backgroundColor: '', borderColor: '', fontColor: '', order: 1 },
                    { id: 'lane-ops', name: 'Operations', backgroundColor: '', borderColor: '', fontColor: '', order: 2 }
                ],
                nodes: [
                    { stepId: 'S1', stepName: 'Submit RFC', shapeType: 'start', swimlane: 'lane-req', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#16a34a', borderColor: '#16a34a', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' },
                    { stepId: 'S2', stepName: 'CAB Review', shapeType: 'process', swimlane: 'lane-cab', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Approved?', shapeType: 'decision', swimlane: 'lane-cab', nextStep: '', yesPath: 'S4', noPath: 'S6', backgroundColor: '#ffffff', fontColor: '#d97706', borderColor: '#d97706', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Implement Change', shapeType: 'subprocess', swimlane: 'lane-ops', nextStep: 'S5', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#059669', borderColor: '#059669', connectionLineColor: '#64748b', connectionLabel: '', width: 160, height: 70, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Verify & Close', shapeType: 'process', swimlane: 'lane-ops', nextStep: 'S6', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#4f46e5', borderColor: '#4f46e5', connectionLineColor: '#64748b', connectionLabel: '', width: 150, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S6', stepName: 'End', shapeType: 'end', swimlane: 'lane-req', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#ffffff', fontColor: '#dc2626', borderColor: '#dc2626', connectionLineColor: '#64748b', connectionLabel: '', width: 120, height: 50, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        },
        'maintenance-workflow': {
            name: '5-Day Maintenance Workflow',
            data: {
                version: '1.0',
                settings: { theme: 'light', connectorStyle: 'orthogonal', gridSnap: true, gridSize: 20, laneOrientation: 'horizontal' },
                lanes: [
                    { id: 'lane-user', name: 'User', backgroundColor: '#ffffff', borderColor: '#5c877d', fontColor: '#2c4740', order: 0 },
                    { id: 'lane-tech', name: 'Tech Support', backgroundColor: '#ffffff', borderColor: '#5c877d', fontColor: '#2c4740', order: 1 },
                    { id: 'lane-tester', name: 'Tester', backgroundColor: '#ffffff', borderColor: '#5c877d', fontColor: '#2c4740', order: 2 },
                    { id: 'lane-dev', name: 'Development', backgroundColor: '#ffffff', borderColor: '#5c877d', fontColor: '#2c4740', order: 3 }
                ],
                nodes: [
                    // Lane: User
                    { stepId: 'S1', stepName: 'Report issue', shapeType: 'start', swimlane: 'lane-user', nextStep: 'S2', yesPath: '', noPath: '', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S5', stepName: 'Confirm solution\nIssue closed', shapeType: 'start', swimlane: 'lane-user', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S15', stepName: 'Communication', shapeType: 'process', swimlane: 'lane-user', nextStep: 'S14', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S13', stepName: 'Close issue', shapeType: 'end', swimlane: 'lane-user', nextStep: '', yesPath: '', noPath: '', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 60, icon: '', notes: '', description: '' },

                    // Lane: Tech Support
                    { stepId: 'S2', stepName: 'Receive issue\nOpen ticket', shapeType: 'process', swimlane: 'lane-tech', nextStep: 'S3', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S3', stepName: 'Known issue?', shapeType: 'decision', swimlane: 'lane-tech', nextStep: '', yesPath: 'S4', noPath: 'S6', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S4', stepName: 'Provide solution', shapeType: 'process', swimlane: 'lane-tech', nextStep: 'S5', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S14', stepName: 'Request more info', shapeType: 'process', swimlane: 'lane-tech', nextStep: 'S15', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S12', stepName: 'Provide update', shapeType: 'process', swimlane: 'lane-tech', nextStep: 'S13', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },

                    // Lane: Tester
                    { stepId: 'S6', stepName: 'Issue testing', shapeType: 'process', swimlane: 'lane-tester', nextStep: 'S7', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S7', stepName: 'Issue reproduced?', shapeType: 'decision', swimlane: 'lane-tester', nextStep: '', yesPath: 'S8', noPath: 'S14', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },
                    { stepId: 'S11', stepName: 'Resolved?', shapeType: 'decision', swimlane: 'lane-tester', nextStep: '', yesPath: 'S12', noPath: 'S9', backgroundColor: '#6ba398', fontColor: '#ffffff', borderColor: '#558c81', connectionLineColor: '#64748b', connectionLabel: '', width: 130, height: 100, icon: '', notes: '', description: '' },

                    // Lane: Development
                    { stepId: 'S8', stepName: 'Bug filing', shapeType: 'database', swimlane: 'lane-dev', nextStep: 'S9', yesPath: '', noPath: '', backgroundColor: '#405060', fontColor: '#ffffff', borderColor: '#304050', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 70, icon: '', notes: '', description: '' },
                    { stepId: 'S9', stepName: 'Feasibility assessment', shapeType: 'process', swimlane: 'lane-dev', nextStep: 'S10', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' },
                    { stepId: 'S10', stepName: 'Fix and test', shapeType: 'process', swimlane: 'lane-dev', nextStep: 'S11', yesPath: '', noPath: '', backgroundColor: '#707070', fontColor: '#ffffff', borderColor: '#5c5c5c', connectionLineColor: '#64748b', connectionLabel: '', width: 140, height: 60, icon: '', notes: '', description: '' }
                ],
                edges: []
            }
        }
    };

    // Normalize all templates to have transparent backgrounds, black fonts, and black borders by default
    Object.values(templates).forEach(tpl => {
        if (tpl.data && tpl.data.nodes) {
            tpl.data.nodes.forEach(n => {
                n.backgroundColor = 'transparent';
                n.fontColor = '#000000';
                n.borderColor = '#000000';
            });
        }
    });

    window.PMB = window.PMB || {};
    window.PMB.Templates = templates;
})();
