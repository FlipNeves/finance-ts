import { useTranslation } from 'react-i18next';

export const useCategoryTranslation = () => {
  const { t } = useTranslation();

  const translateCategory = (category: string) => {
    if (!category) return category;
    const catMap = t('categoryNames', { returnObjects: true, defaultValue: {} }) as Record<string, string>;

    if (catMap[category]) return catMap[category];

    const catTrimmed = category.trim();
    if (catMap[catTrimmed]) return catMap[catTrimmed];

    const key = Object.keys(catMap).find(k => k.toLowerCase() === catTrimmed.toLowerCase());
    if (key && catMap[key]) return catMap[key];

    return category;
  };

  return { translateCategory };
};
