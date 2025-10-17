import { ai } from "@/ai/genkit";
import './flows/studentDataAssistant';

ai.listFlows().then(flows => {
    console.log('--- Flows ---');
    flows.forEach(flow => {
        console.log(
            `${flow.name} - ${flow.description ?? 'No description'}`
        );
    });
});
