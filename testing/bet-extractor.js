class SettledBetsCanonocalizer {
    constructor(cheerioNode) {
        this.cheerioNode = cheerioNode;
    }

    canonicalize() {
        return {

        };
    }
}

class OpenBetCanonicalizer {
    constructor(cheerioNode) {
        this.cheerioNode = cheerioNode;
    }

    canonicalize() {
        return {

        };
    }
}

const extractData = (cheerioElement) => {
    try {
        const classAttribute = el.attr('class');

        if (!classAttribute) {
            return { status: 'error', reason: 'No class attribute found' };
        }

        const splittedList = classAttribute.split(' ');

        const setteledItem = splittedList.includes('myb-SettledBetItem');
        const openItem = splittedList.includes('myb-OpenBetItem');

        if (setteledItem && !openItem) {
            const cannoicalData = new SettledBetsCanonocalizer($el).canonicalize();

            return { status: 'success', data: cannoicalData };
        } if (openItem && !setteledItem) {
            const canonicalData = new OpenBetCanonicalizer($el).canonicalize();

            return { status: 'success', data: canonicalData };
        }

        const betData = extractBetData($el);

        return { status: 'success', data: betData };
    } catch (error) {
        return { status: 'error', reason: error.message };
    }
};
