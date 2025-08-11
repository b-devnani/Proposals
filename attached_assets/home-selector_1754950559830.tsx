import { Card, CardContent } from "@/components/ui/card";
import { homeModels } from "@/lib/home-models";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function HomeSelector() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-12">
          Select a Floor Plan
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {homeModels.map((home) => (
            <motion.div
              key={home.id}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link href={`/configurator/${home.id}`}>
                <Card className="cursor-pointer hover:bg-accent/5">
                  <CardContent className="p-0">
                    <div className="aspect-[4/3] bg-muted">
                      <img
                        src={home.imageUrl || `/api/placeholder/600/400?text=${home.name}`}
                        alt={`${home.name} Floor Plan`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">{home.name}</h2>
                        <p className="text-xl font-bold text-primary">
                          From ${home.basePrice.toLocaleString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🏠</span>
                          <span>{home.beds}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🛁</span>
                          <span>{home.baths}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🚪</span>
                          <span>{home.garage}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">📏</span>
                          <span>{home.sqft.toLocaleString()} SF</span>
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