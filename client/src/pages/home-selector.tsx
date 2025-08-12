import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HomeTemplate } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import ravelloImage from "@assets/Ravello_1754950998192.webp";
import sorrentoImage from "@assets/Sorrento_1754950998192.webp";
import veronaImage from "@assets/Verona_1754950998191.webp";

interface ExtendedHomeTemplate extends HomeTemplate {
  beds: string;
  baths: string;
  garage: string;
  sqft: number;
  imageUrl?: string;
}

const homeTemplateDetails: Record<string, Omit<ExtendedHomeTemplate, 'id' | 'name' | 'basePrice'>> = {
  'Sorrento': {
    beds: '2 Beds',
    baths: '2 Baths', 
    garage: '2 Car Garage',
    sqft: 2002,
    imageUrl: sorrentoImage,
    baseCost: '0'
  },
  'Ravello': {
    beds: '4 Beds',
    baths: '3 Baths',
    garage: '2 Car Garage', 
    sqft: 2184,
    imageUrl: ravelloImage,
    baseCost: '0'
  },
  'Verona': {
    beds: '2 Beds',
    baths: '2 Baths',
    garage: '2 Car Garage',
    sqft: 1987,
    imageUrl: veronaImage,
    baseCost: '0'
  }
};

export default function HomeSelector() {
  const { data: templates = [], isLoading } = useQuery<HomeTemplate[]>({
    queryKey: ['/api/templates'],
  });

  const enrichedTemplates = templates.map(template => ({
    ...template,
    ...homeTemplateDetails[template.name]
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading home templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with theme toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-gray-800 dark:text-gray-200 mb-4 relative pb-4">
            Select a Floor Plan
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-blue-500"></div>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {enrichedTemplates.map((home) => (
            <motion.div
              key={home.id}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full max-w-sm"
            >
              <Link href={`/proposal/${home.name.toLowerCase()}`}>
                <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 overflow-hidden rounded-none">
                  <CardContent className="p-0">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={home.imageUrl}
                        alt={`${home.name} Floor Plan`}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-800">{home.name}</h2>
                        <p className="text-lg font-bold text-blue-600">
                          From ${parseInt(home.basePrice).toLocaleString()}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">🏠</span>
                            <span>{home.beds}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">🛁</span>
                            <span>{home.baths}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">🚪</span>
                            <span>{home.garage}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">📏</span>
                            <span>{home.sqft.toLocaleString()} SF</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}