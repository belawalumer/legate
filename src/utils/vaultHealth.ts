import { VaultCategory, VaultHealth } from '../types';
import { VAULT_CATEGORIES } from '../constants';

/**
 * Calculate vault health score based on filled categories
 */
export function calculateVaultHealth(
  items: { category: VaultCategory }[]
): VaultHealth {
  const categoryCounts: Record<VaultCategory, number> = {} as Record<VaultCategory, number>;
  
  // Initialize all categories to 0
  VAULT_CATEGORIES.forEach(cat => {
    categoryCounts[cat.value] = 0;
  });

  // Count items per category
  items.forEach(item => {
    if (categoryCounts[item.category] !== undefined) {
      categoryCounts[item.category]++;
    }
  });

  // Calculate category scores (0-100 based on whether category has items)
  const categoryScores: Record<VaultCategory, number> = {} as Record<VaultCategory, number>;
  const missingCategories: VaultCategory[] = [];

  VAULT_CATEGORIES.forEach(cat => {
    const hasItems = categoryCounts[cat.value] > 0;
    categoryScores[cat.value] = hasItems ? 100 : 0;
    
    if (!hasItems) {
      missingCategories.push(cat.value);
    }
  });

  // Calculate total score
  const totalScore = Math.round(
    (Object.values(categoryScores).reduce((sum, score) => sum + score, 0) /
      VAULT_CATEGORIES.length)
  );

  // Generate recommendations
  const recommendations: string[] = [];
  if (missingCategories.length > 0) {
    recommendations.push(
      `Add items to ${missingCategories.length} missing categor${missingCategories.length === 1 ? 'y' : 'ies'} to improve your score`
    );
  }
  if (totalScore === 100) {
    recommendations.push('Your vault is complete! Consider reviewing annually.');
  }

  return {
    total_score: totalScore,
    category_scores: categoryScores,
    missing_categories: missingCategories,
    recommendations,
  };
}
