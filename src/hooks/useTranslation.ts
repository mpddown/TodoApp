import { hebrewTranslations } from '../locales/he';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationPath = NestedKeyOf<typeof hebrewTranslations>;

export const useTranslation = () => {
  const t = (path: TranslationPath): string => {
    const keys = path.split('.');
    let value: any = hebrewTranslations;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        console.warn(`Translation missing for path: ${path}`);
        return path;
      }
    }
    
    return typeof value === 'string' ? value : path;
  };

  const getRandomGreeting = (): string => {
    const greetings = hebrewTranslations.greetings;
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return { t, getRandomGreeting };
};