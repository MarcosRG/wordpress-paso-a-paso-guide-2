
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">{t('filterByCategory')}</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => onCategoryChange('all')}
          size="sm"
        >
          {t('all')}
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => onCategoryChange(category)}
            size="sm"
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
};
