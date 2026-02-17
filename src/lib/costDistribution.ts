// costDistribution.ts

/**
 * Function to calculate cost distribution across a given group of items.
 * @param costs - Array of numbers representing costs for each item.
 * @returns An object containing total cost and individual distribution.
 */
function calculateCostDistribution(costs: number[]): { total: number; distribution: Record<number, number> } {
    const total = costs.reduce((acc, cost) => acc + cost, 0);
    const distribution: Record<number, number> = {};

    costs.forEach((cost, index) => {
        distribution[index] = cost;
    });

    return { total, distribution };
}

export default calculateCostDistribution;
