import React from 'react';
import { useTranslation } from 'react-i18next';
import './MonthNavigator.css';

interface MonthNavigatorProps {
  currentMonth: Date;
  onChange: (date: Date) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ currentMonth, onChange }) => {
  const { i18n } = useTranslation();

  const handlePrev = () => onChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNext = () => onChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const label = currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

  return (
    <div className="month-nav">
      <button className="month-nav-arrow" onClick={handlePrev}>&lt;</button>
      <span className="month-nav-label">{label}</span>
      <button className="month-nav-arrow" onClick={handleNext}>&gt;</button>
    </div>
  );
};

export default MonthNavigator;
