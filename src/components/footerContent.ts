import { Language } from '../redux/ui/slice';

export interface FooterLinkItem {
  url: string;
  ariaLabel: string;
}

export interface FooterContentData {
  financialSupport: {
    title: string;
    textBeforeLink: string;
    petrobrasLinkText: string;
    projectText: string;
    studyTitle: string;
  };
  development: {
    title: string;
    linearPhase: {
      subtitle: string;
      authors: string;
      institution: string;
    };
    radialPhase: {
      subtitle: string;
      authors: string;
      links: {
        linkedin: FooterLinkItem;
        github: FooterLinkItem;
      };
    };
  };
  relatedPublication: {
    title: string;
    citation: string;
    availableIn: string;
    linkText: string;
    url: string;
  };
  models: {
    title: string;
    acidCorrelationLabel: string;
    acidCorrelationRef: string;
    pvbtModelLabel: string;
    pvbtModelRef: string;
  };
  copyright: string;
  bottomLinks: {
    linkedin: FooterLinkItem;
    github: FooterLinkItem;
  };
}

export const footerContentEn: FooterContentData = {
  financialSupport: {
    title: 'Financial Support',
    textBeforeLink: 'This project was partially funded by ',
    petrobrasLinkText: 'Petrobras',
    projectText: ' through project 2019/00154-4, entitled ',
    studyTitle: '"Study of Carbonate Acidification Using Low Reactivity Systems."',
  },
  development: {
    title: 'Development',
    linearPhase: {
      subtitle: 'Linear model (2022–2025)',
      authors: 'Luiz Guilherme Valente Cardoso, Cláudio Regis dos Santos Lucas, Pedro Tupã Pandava Aum',
      institution: 'Laboratório de Ciência e Engenharia de Petróleo (LCPETRO), Universidade Federal do Pará (UFPA)',
    },
    radialPhase: {
      subtitle: 'Radial model and application development (2026)',
      authors: 'Douglas Fonseca, Silvério Sirotheau Corrêa Neto, Pedro Tupã Pandava Aum',
      links: {
        linkedin: {
          url: 'https://www.linkedin.com/',
          ariaLabel: 'LinkedIn de Douglas Fonseca',
        },
        github: {
          url: 'https://github.com/costxs',
          ariaLabel: 'GitHub de Douglas Fonseca',
        },
      },
    },
  },
  relatedPublication: {
    title: 'Related Publication',
    citation:
      'CARDOSO, Luiz Guilherme Valente et al. Desenvolvimento de Um Software In House para Análise do Pore Volume To Breakthrough (PVBt) na Estimulação Ácida em Carbonatos. In: ANAIS DO 11º CONGRESSO BRASILEIRO DE PETRÓLEO E GáS, 2022, Belém. Anais eletrônicos, Galoá, 2022.',
    availableIn: 'Avaliable in: ',
    linkText: 'Anais do 11º Congresso Brasileiro de Petróleo e Gás',
    url: 'https://proceedings.science/pdpetro-2022/trabalhos/desenvolvimento-de-um-software-in-house-para-analise-do-pore-volume-to-breakthro?lang=pt-br',
  },
  models: {
    title: 'Models',
    acidCorrelationLabel: 'Acid corelation: ',
    acidCorrelationRef: "Perry, R. H. (1934). Perry's Chemical Engineers' Handbook.",
    pvbtModelLabel: 'PVBt Model: ',
    pvbtModelRef:
      'Ali, M., & Ziauddin, M. (2020). Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. Journal of Petroleum Science and Engineering, 2020.',
  },
  copyright: '© 2025–2026 Luiz Valente, Douglas Fonseca. Linear model developed as a Final Graduation Project. All rights reserved.',
  bottomLinks: {
    linkedin: {
      url: 'https://www.linkedin.com/in/luiz-valente/',
      ariaLabel: 'LinkedIn',
    },
    github: {
      url: 'https://github.com/ByteAngler',
      ariaLabel: 'GitHub',
    },
  },
};

export const footerContentPt: FooterContentData = {
  financialSupport: {
    title: 'Apoio Financeiro',
    textBeforeLink: 'Este projeto foi parcialmente financiado pela ',
    petrobrasLinkText: 'Petrobras',
    projectText: ' através do projeto 2019/00154-4, intitulado ',
    studyTitle: '"Estudo da Acidificação de Carbonatos Utilizando Sistemas de Baixa Reatividade."',
  },
  development: {
    title: 'Desenvolvimento',
    linearPhase: {
      subtitle: 'Modelo linear (2022–2025)',
      authors: 'Luiz Guilherme Valente Cardoso, Cláudio Regis dos Santos Lucas, Pedro Tupã Pandava Aum',
      institution: 'Laboratório de Ciência e Engenharia de Petróleo (LCPETRO), Universidade Federal do Pará (UFPA)',
    },
    radialPhase: {
      subtitle: 'Modelo radial e desenvolvimento da aplicação (2026)',
      authors: 'Douglas Fonseca, Silvério Sirotheau Corrêa Neto, Pedro Tupã Pandava Aum',
      links: {
        linkedin: {
          url: 'https://www.linkedin.com/',
          ariaLabel: 'LinkedIn de Douglas Fonseca',
        },
        github: {
          url: 'https://github.com/costxs',
          ariaLabel: 'GitHub de Douglas Fonseca',
        },
      },
    },
  },
  relatedPublication: {
    title: 'Publicação Relacionada',
    citation:
      'CARDOSO, Luiz Guilherme Valente et al. Desenvolvimento de Um Software In House para Análise do Pore Volume To Breakthrough (PVBt) na Estimulação Ácida em Carbonatos. In: ANAIS DO 11º CONGRESSO BRASILEIRO DE PETRÓLEO E GáS, 2022, Belém. Anais eletrônicos, Galoá, 2022.',
    availableIn: 'Disponível em: ',
    linkText: 'Anais do 11º Congresso Brasileiro de Petróleo e Gás',
    url: 'https://proceedings.science/pdpetro-2022/trabalhos/desenvolvimento-de-um-software-in-house-para-analise-do-pore-volume-to-breakthro?lang=pt-br',
  },
  models: {
    title: 'Modelos',
    acidCorrelationLabel: 'Correlação ácida: ',
    acidCorrelationRef: "Perry, R. H. (1934). Perry's Chemical Engineers' Handbook.",
    pvbtModelLabel: 'Modelo PVBt: ',
    pvbtModelRef:
      'Ali, M., & Ziauddin, M. (2020). Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. Journal of Petroleum Science and Engineering, 2020.',
  },
  copyright: '© 2025–2026 Luiz Valente, Douglas Fonseca. Linear model developed as a Final Graduation Project. All rights reserved.',
  bottomLinks: {
    linkedin: {
      url: 'https://www.linkedin.com/in/luiz-valente/',
      ariaLabel: 'LinkedIn',
    },
    github: {
      url: 'https://github.com/ByteAngler',
      ariaLabel: 'GitHub',
    },
  },
};

export function getFooterContent(lang?: Language): FooterContentData {
  return lang === 'pt' ? footerContentPt : footerContentEn;
}
