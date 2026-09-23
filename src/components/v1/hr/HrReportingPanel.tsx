import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Language, StaffMember } from '@/types/v1';
import {
  computeAverageTenureMonths,
  computeTurnoverRate,
  departmentHeadcountSeries,
  groupStaffByDepartment,
  departmentLabel,
} from '@/lib/hrDerivedMetrics';

interface HrReportingPanelProps {
  language: Language;
  staffList: StaffMember[];
  branchName?: string;
}

export const HrReportingPanel: React.FC<HrReportingPanelProps> = ({
  language,
  staffList,
  branchName,
}) => {
  const isSw = language === 'sw';
  const series = useMemo(() => departmentHeadcountSeries(staffList), [staffList]);
  const tenure = computeAverageTenureMonths(staffList);
  const turnover = computeTurnoverRate(staffList);
  const grouped = groupStaffByDepartment(staffList);

  return (
    <div className="space-y-4 bg-[#f5faf7] border border-[#d4e8dc] rounded-lg p-4 sm:p-6">
      <div>
        <p className="text-xs text-[#5a7a68]">
          {isSw ? 'Wafanyakazi / Ripoti / Uchambuzi wa idara' : 'Employees / Reporting / Department analysis'}
        </p>
        <h3 className="text-lg font-bold text-[#1a3d2e] mt-1">
          {isSw ? 'Uchambuzi wa idara' : 'Department analysis'}
          {branchName ? ` · ${branchName}` : ''}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#d4e8dc] rounded-md p-4">
          <p className="text-xs text-[#5a7a68]">{isSw ? 'Jumla wafanyakazi' : 'Total employees'}</p>
          <p className="text-2xl font-black text-[#1a3d2e] mt-1">{staffList.length}</p>
        </div>
        <div className="bg-white border border-[#d4e8dc] rounded-md p-4">
          <p className="text-xs text-[#5a7a68]">{isSw ? 'Wastani wa muda' : 'Average tenure'}</p>
          <p className="text-2xl font-black text-[#1a3d2e] mt-1">{tenure.toFixed(1)} {isSw ? 'miezi' : 'mo'}</p>
        </div>
        <div className="bg-white border border-[#d4e8dc] rounded-md p-4">
          <p className="text-xs text-[#5a7a68]">{isSw ? 'Kiwango cha uhamisho' : 'Turnover rate'}</p>
          <p className="text-2xl font-black text-[#1a3d2e] mt-1">{turnover.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white border border-[#d4e8dc] rounded-md p-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7f5ec" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#107C10" strokeWidth={2.5} dot={{ r: 3, fill: '#107C10' }} name={isSw ? 'Wafanyakazi' : 'Headcount'} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-[#d4e8dc] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
            <tr>
              <th className="text-left px-4 py-2">{isSw ? 'Idara' : 'Department'}</th>
              <th className="text-right px-4 py-2">{isSw ? 'Hai' : 'Active'}</th>
              <th className="text-right px-4 py-2">{isSw ? 'Jumla' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(grouped) as Array<keyof typeof grouped>).map(dept => (
              <tr key={dept} className="border-t border-[#eef5f0]">
                <td className="px-4 py-2 font-semibold">{departmentLabel(dept, isSw)}</td>
                <td className="px-4 py-2 text-right font-mono">{grouped[dept].filter(s => s.active).length}</td>
                <td className="px-4 py-2 text-right font-mono">{grouped[dept].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
