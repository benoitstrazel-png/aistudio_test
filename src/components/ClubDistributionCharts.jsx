import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#CEF002', '#22d3ee', '#f472b6', '#a78bfa', '#fbbf24', '#94a3b8'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 p-2 border border-slate-700 rounded shadow-xl">
                <p className="text-white font-bold">{payload[0].name}</p>
                <p className="text-accent text-sm">{payload[0].value} {payload[0].payload.unit}</p>
            </div>
        );
    }
    return null;
};

const ClubDistributionCharts = ({ players }) => {
    const processData = (dataObj, unit) => {
        if (!dataObj) return [];
        const sorted = Object.entries(dataObj)
            .map(([name, value]) => ({ name, value, unit }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length <= 5) return sorted;

        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);

        if (others > 0) {
            top5.push({ name: 'Autres', value: others, unit });
        }
        return top5;
    };

    const scorersData = processData(players?.scorers, 'Buts');
    const assistersData = processData(players?.assisters, 'Passes');

    const ChartSection = ({ title, data, emptyMsg }) => (
        <div className="card bg-white/5 p-4 flex flex-col items-center">
            <h4 className="text-secondary text-xs uppercase font-bold mb-4 w-full text-left">{title}</h4>
            <div className="w-full h-[250px]">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
                        {emptyMsg}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartSection title="⚽ Répartition des Buteurs" data={scorersData} emptyMsg="Aucun but marqué enregistré" />
            <ChartSection title="👟 Répartition des Passeurs" data={assistersData} emptyMsg="Aucune passe décisive enregistrée" />
        </div>
    );
};

export default ClubDistributionCharts;
