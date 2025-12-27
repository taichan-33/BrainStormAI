export const DEFAULT_AGENTS: Record<string, { role: string; color: string; bg: string; icon: string }> = {
  "01": { role: "司会 (Facilitator)", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: "🎙️" },
  "02": { role: "起業家 (Innovator)", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: "🚀" },
  "03": { role: "批評家 (Critic)", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "🧐" },
  "04": { role: "戦略家 (Strategist)", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", icon: "🔧" },
  "05": { role: "マーケター (Marketer)", color: "text-pink-600", bg: "bg-pink-50 border-pink-200", icon: "📣" },
  "06": { role: "技術者 (Tech Lead)", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: "🔧" },
};

export const CUSTOM_COLORS = [
  { color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200", icon: "🤖" },
  { color: "text-orange-600", bg: "bg-orange-50 border-orange-200", icon: "🧩" },
  { color: "text-teal-600", bg: "bg-teal-50 border-teal-200", icon: "💡" },
];

export interface CustomAgent {
  id?: string;
  name: string;
  role: string;
  responsibility: string;
  personality: string;
  model: string;
}
