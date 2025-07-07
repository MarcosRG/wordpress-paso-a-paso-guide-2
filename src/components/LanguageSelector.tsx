import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-600" />
      <Button
        variant={language === "pt" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("pt")}
        className={
          language === "pt"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border-red-600 text-red-600 hover:bg-red-50"
        }
      >
        PT
      </Button>
      <Button
        variant={language === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("en")}
        className={
          language === "en"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border-red-600 text-red-600 hover:bg-red-50"
        }
      >
        EN
      </Button>
    </div>
  );
};
