import { GoogleGenAI } from "@google/genai";
import { CollectionRecord, Farmer } from "../types";

// Initialize Gemini client safely
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDailyReport = async (
  records: CollectionRecord[],
  farmers: Farmer[]
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service Unavailable: API Key missing.";

  // Prepare data context
  const today = new Date().toISOString().split('T')[0];
  const todaysRecords = records.filter(r => r.timestamp.startsWith(today));
  
  const totalWeight = todaysRecords.reduce((sum, r) => sum + r.weight, 0);
  const avgQuality = todaysRecords.length > 0 
    ? todaysRecords.reduce((sum, r) => sum + r.qualityScore, 0) / todaysRecords.length 
    : 0;

  const prompt = `
    You are an expert Agronomist and Data Analyst for the Kenyan Tea Development Agency.
    Analyze the following tea collection data for today (${today}).
    
    Data Summary:
    - Total Weight Collected: ${totalWeight.toFixed(2)} kg
    - Average Leaf Quality Score: ${avgQuality.toFixed(1)}/100
    - Number of Collections: ${todaysRecords.length}
    - Active Farmers Today: ${new Set(todaysRecords.map(r => r.farmerId)).size}

    Please provide a concise 3-paragraph executive summary:
    1. Performance Overview: Comment on the volume and quality.
    2. Operational Alerts: Identify if quality is below standard (Acceptable is >80) or if volume is low.
    3. Recommendations: Suggest one actionable tip for the field clerks or farmers for tomorrow (e.g., regarding leaf handling or plucking standards).
    
    Keep the tone professional yet accessible to cooperative managers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating report. Please try again later.";
  }
};

export const askAiAssistant = async (question: string, contextData: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service Unavailable.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context Data (JSON): ${contextData}\n\nUser Question: ${question}\n\nAnswer the user's question based on the provided context data regarding tea collections. Keep it brief.`,
    });
    return response.text || "I couldn't generate an answer.";
  } catch (error) {
    return "I encountered an error trying to answer that.";
  }
};

export const runMLAnalysis = async (
  records: CollectionRecord[],
  modelType: 'forecast' | 'anomaly' | 'clustering',
  params: any
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service Unavailable: API Key missing.";

  // Aggregation to reduce token count
  const dailyStats: Record<string, { weight: number, quality: number, count: number }> = {};
  
  records.forEach(r => {
    const date = r.timestamp.split('T')[0];
    if (!dailyStats[date]) dailyStats[date] = { weight: 0, quality: 0, count: 0 };
    dailyStats[date].weight += r.weight;
    dailyStats[date].quality += r.qualityScore;
    dailyStats[date].count += 1;
  });

  const formattedData = Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    totalWeight: stats.weight.toFixed(1),
    avgQuality: (stats.quality / stats.count).toFixed(1)
  })).sort((a,b) => a.date.localeCompare(b.date));

  const dataContext = JSON.stringify(formattedData.slice(-30)); // Last 30 days max

  let systemPrompt = "";
  
  switch (modelType) {
    case 'forecast':
      systemPrompt = `
        Act as a Predictive Analytics Model. 
        Based on the provided daily tea collection data (Date, Weight, Quality), forecast the trends for the next ${params.horizon || 7} days.
        Consider seasonality and recent trends.
        Output Format:
        1. Projected Total Volume (Next ${params.horizon} days).
        2. Expected Quality Trend (Improving/Declining).
        3. Day-by-day forecast table (Date, Predicted Weight).
      `;
      break;
    case 'anomaly':
      systemPrompt = `
        Act as an Anomaly Detection Algorithm.
        Analyze the provided daily tea collection data.
        Sensitivity Level: ${params.sensitivity || 'Medium'}.
        Identify any data points that deviate significantly from the norm (outliers in Weight or Quality).
        Output Format:
        1. List of Anomalous Dates.
        2. Reason for flagging (e.g., "Unexpectedly high yield", "Quality drop > 15%").
        3. Potential operational cause (e.g., "Rainfall", "Equipment Error").
      `;
      break;
    case 'clustering':
      systemPrompt = `
        Act as a Data Clustering Model.
        Analyze the daily performance. Group the days into clusters based on Performance (High Yield/High Quality, Low Yield/Low Quality, etc.).
        Output Format:
        1. Cluster Definitions.
        2. Percentage of days in each cluster.
        3. Strategic insight for each cluster (e.g., "Best harvest days correlate with...").
      `;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\nDataset: ${dataContext}`,
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini ML Error:", error);
    return "Error running ML model. Please try again.";
  }
};
