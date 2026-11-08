import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { classifyIngredient } from '../engine/ingredientHighlight';
import { useI18n } from '../i18n';
import type { AdditiveAuditResult, Issue } from '../types';

export const INGREDIENT_COLORS = { banned: '#D92D20', warning: '#DC6803' };

interface Props {
  ingredients: string[];
  issues: Issue[];
  /** Передавайте только для халяль-профиля: Е-добавки со статусом «харам / сомнительно» тоже подсвечиваются. */
  additives?: AdditiveAuditResult[];
}

/** Список состава: запрещённые и сомнительные ингредиенты крупнее, жирнее и цветные. */
export function IngredientsList({ ingredients, issues, additives }: Props) {
  const { t } = useI18n();
  const items = ingredients.map((ing) => ({ ing, sev: classifyIngredient(ing, issues, additives) }));
  const hasBanned = items.some((i) => i.sev === 'BANNED');
  const hasWarning = items.some((i) => i.sev === 'WARNING');

  return (
    <View>
      <View style={styles.box}>
        {items.map(({ ing, sev }, idx) => (
          <Text
            key={`${idx}-${ing}`}
            style={[styles.base, sev === 'BANNED' && styles.banned, sev === 'WARNING' && styles.warning]}
          >
            {ing}
          </Text>
        ))}
      </View>
      {hasBanned || hasWarning ? (
        <View style={styles.legend}>
          {hasBanned ? (
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: INGREDIENT_COLORS.banned }]} />
              <Text style={styles.legendText}>{t('legend_haram')}</Text>
            </View>
          ) : null}
          {hasWarning ? (
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: INGREDIENT_COLORS.warning }]} />
              <Text style={styles.legendText}>{t('legend_doubtful')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginTop: 8, gap: 4 },
  base: { fontSize: 15, color: '#14171F', lineHeight: 20 },
  banned: { fontSize: 17, fontWeight: '800', color: INGREDIENT_COLORS.banned, lineHeight: 23 },
  warning: { fontSize: 16, fontWeight: '700', color: INGREDIENT_COLORS.warning, lineHeight: 22 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#5B6372' },
});
