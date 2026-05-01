import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export interface PageChrome {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: ReactNode;
    badges?: ReactNode;
}

const PageChromeStateContext = createContext<PageChrome | null>(null);
const PageChromeDispatchContext = createContext<((chrome: PageChrome) => void) | null>(null);

interface PageChromeProviderProps {
    children: ReactNode;
    defaultChrome: PageChrome;
    resetKey: string;
}

export function PageChromeProvider({ children, defaultChrome, resetKey }: PageChromeProviderProps) {
    const [chrome, setChromeState] = useState<PageChrome>(defaultChrome);

    useEffect(() => {
        setChromeState(defaultChrome);
    }, [defaultChrome, resetKey]);

    const setChrome = useCallback((nextChrome: PageChrome) => {
        setChromeState(nextChrome);
    }, []);

    const dispatchValue = useMemo(() => setChrome, [setChrome]);

    return (
        <PageChromeDispatchContext.Provider value={dispatchValue}>
            <PageChromeStateContext.Provider value={chrome}>
                {children}
            </PageChromeStateContext.Provider>
        </PageChromeDispatchContext.Provider>
    );
}

export function usePageChrome() {
    return useContext(PageChromeStateContext);
}

export function usePageChromeSetter() {
    return useContext(PageChromeDispatchContext);
}
