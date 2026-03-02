import React from "react";

export type ChartType = "bp" | "sugar" | "hr" | "calories";

type Props = {
  type: ChartType;
  data: any[];
};

export default function ChartLoader({ type, data }: Props) {
  const [Recharts, setRecharts] = React.useState<any | null>(null);

  React.useEffect(() => {
    let mounted = true;
    import("recharts").then((m) => {
      if (mounted) setRecharts(m);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Recharts) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(186,86%,30%)] border-t-transparent" />
      </div>
    );
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } = Recharts;

  if (type === "bp") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="systolic" stroke="hsl(0, 80%, 55%)" strokeWidth={2} name="Systolic" dot={{ r: 3 }} />
          <Line type="monotone" dataKey="diastolic" stroke="hsl(210, 80%, 55%)" strokeWidth={2} name="Diastolic" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "sugar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="hsl(210, 80%, 55%)" fill="hsl(210, 80%, 55%)" fillOpacity={0.1} strokeWidth={2} name="Blood Sugar" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "hr") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="hsl(350, 80%, 55%)" strokeWidth={2} name="Heart Rate" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // calories / last7Days
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v} kcal`, "Calories"]} />
        <Area type="monotone" dataKey="calories" stroke="hsl(25, 95%, 53%)" fill="hsl(25, 95%, 53%)" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
