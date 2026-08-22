export type ViatorActivity = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  thumbnail: string | null;
  cost: number | null;
  estimatedCost: number | null;
  duration: string;
  durationMinutes: number | null;
  rating: number | null;
  totalReviews: number | null;
  source: "viator" | "local";
};

export const viatorService = {
  async fetchActivitiesByCity(cityName: string, count = 20): Promise<ViatorActivity[]> {
    const apiKey = process.env.VIATOR_API_KEY;
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch("https://api.viator.com/partner/search/freetext", {
        method: "POST",
        headers: {
          "exp-api-key": apiKey,
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
          Accept: "application/json;version=2.0",
        },
        body: JSON.stringify({
          searchTerm: cityName,
          currency: "INR",
          searchTypes: [
            {
              searchType: "PRODUCTS",
              pagination: { start: 1, count },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn(`Viator API warning (${response.status}):`, await response.text());
        return [];
      }

      const data = (await response.json()) as any;

      // Extract products array safely from v2 search response structure
      let productsList: any[] = [];
      if (Array.isArray(data.products?.results)) {
        productsList = data.products.results;
      } else if (Array.isArray(data.products)) {
        productsList = data.products;
      } else if (Array.isArray(data.results)) {
        productsList = data.results;
      } else if (Array.isArray(data.searchTypes)) {
        const prodGroup = data.searchTypes.find((st: any) => st.searchType === "PRODUCTS");
        if (prodGroup && Array.isArray(prodGroup.results)) {
          productsList = prodGroup.results;
        }
      }

      return productsList.map((product: any, idx: number) => {
        // 1. Title -> name
        const name = product.title || product.productTitle || product.name || "Tour & Activity";

        // 2. Description -> short description
        const description = product.description || product.shortDescription || null;

        // 3. Images -> pick mid-size thumbnail
        let image: string | null = null;
        if (Array.isArray(product.images) && product.images.length > 0) {
          const imgObj = product.images[0];
          if (Array.isArray(imgObj.variants) && imgObj.variants.length > 0) {
            // Find mid-size (around 500-800px) or fallback to first
            const mid =
              imgObj.variants.find(
                (v: any) => v.width && v.width >= 400 && v.width <= 1000
              ) || imgObj.variants[Math.floor(imgObj.variants.length / 2)] || imgObj.variants[0];
            image = mid.url || imgObj.variants[0].url;
          } else if (typeof imgObj.url === "string") {
            image = imgObj.url;
          }
        }

        // 4. Rating & Reviews
        const rating =
          product.reviews?.combinedAverageRating ??
          product.reviews?.averageRating ??
          product.rating ??
          null;
        const totalReviews =
          product.reviews?.totalReviews ??
          product.reviewCount ??
          null;

        // 5. Cost in INR
        const costVal =
          product.pricing?.summary?.fromPrice ??
          product.pricing?.fromPrice ??
          product.price ??
          null;
        const cost = typeof costVal === "number" ? Math.round(costVal) : null;

        // 6. Duration display string & durationMinutes
        let durationStr = "Duration varies";
        let durationMins: number | null = null;

        if (product.duration) {
          if (typeof product.duration.fixedDurationInMinutes === "number") {
            durationMins = product.duration.fixedDurationInMinutes;
            durationStr = `${durationMins} mins`;
          } else if (typeof product.duration.variableDurationFromMinutes === "number") {
            durationMins = product.duration.variableDurationFromMinutes;
            durationStr = `${durationMins} mins`;
          } else if (typeof product.duration === "string") {
            durationStr = product.duration;
          } else if (typeof product.duration.display === "string") {
            durationStr = product.duration.display;
          }
        }

        return {
          id: product.productCode || `viator-${idx}-${Date.now()}`,
          name,
          description,
          image,
          thumbnail: image,
          cost,
          estimatedCost: cost,
          duration: durationStr,
          durationMinutes: durationMins,
          rating: typeof rating === "number" ? Number(rating.toFixed(1)) : null,
          totalReviews: typeof totalReviews === "number" ? totalReviews : null,
          source: "viator",
        };
      });
    } catch (err) {
      console.error("Viator API fetch error:", err);
      return [];
    }
  },
};
