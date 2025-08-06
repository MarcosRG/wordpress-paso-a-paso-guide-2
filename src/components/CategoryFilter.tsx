import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const PREDEFINED_CATEGORIES = [
  "estrada",
  "gravel",
  "btt",
  "touring",
  "e-bike",
  "junior",
  "extras",
];

export const CategoryFilter = ({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) => {
  const { t } = useLanguage();

  // Use predefined categories or fallback to provided categories
  const displayCategories =
    PREDEFINED_CATEGORIES.length > 0 ? PREDEFINED_CATEGORIES : categories;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">{t("filterByCategory")}</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => onCategoryChange("all")}
          size="sm"
          className="bg-black text-white hover:bg-gray-800"
        >
          {t("all")}
        </Button>
        {displayCategories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => onCategoryChange(category)}
            size="sm"
            className={
              selectedCategory === category
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border-red-600 text-red-600 hover:bg-red-50"
            }
          >
            {t(category)}
          </Button>
        ))}
      </div>
    </div>
  );
};
