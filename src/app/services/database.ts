import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  constructor(private firestore: Firestore) {}

  async listarColecoes() {
    try {
      const colecoes = ['usuarios', 'veiculos', 'manutencoes', 'gastos'];
      
      for (const nomeColecao of colecoes) {
        await getDocs(collection(this.firestore, nomeColecao));
      }
    } catch (error) {
      console.error('Erro ao listar coleções:', error);
    }
  }

  async criarUsuario(userData: any) {
    try {
      const docRef = await addDoc(collection(this.firestore, 'usuarios'), {
        ...userData,
        dataCriacao: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async buscarUsuarioPorEmail(email: string) {
    try {
      const q = query(
        collection(this.firestore, 'usuarios'), 
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  }

  async criarVeiculo(veiculoData: any) {
    try {
      const docRef = await addDoc(collection(this.firestore, 'veiculos'), {
        ...veiculoData,
        dataCriacao: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar veículo:', error);
      throw error;
    }
  }

  async buscarVeiculosPorUsuario(userId: string) {
    try {
      const q = query(
        collection(this.firestore, 'veiculos'),
        where('userId', '==', userId),
        orderBy('dataCriacao', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      throw error;
    }
  }

  async criarManutencao(manutencaoData: any) {
    try {
      const docRef = await addDoc(collection(this.firestore, 'manutencoes'), {
        ...manutencaoData,
        dataCriacao: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar manutenção:', error);
      throw error;
    }
  }

  async buscarManutencoesPorVeiculo(veiculoId: string) {
    try {
      const q = query(
        collection(this.firestore, 'manutencoes'),
        where('veiculoId', '==', veiculoId),
        orderBy('dataManutencao', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error);
      throw error;
    }
  }

  async criarGasto(gastoData: any) {
    try {
      const docRef = await addDoc(collection(this.firestore, 'gastos'), {
        ...gastoData,
        dataCriacao: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar gasto:', error);
      throw error;
    }
  }

  async buscarGastosPorVeiculo(veiculoId: string) {
    try {
      const q = query(
        collection(this.firestore, 'gastos'),
        where('veiculoId', '==', veiculoId),
        orderBy('dataGasto', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar gastos:', error);
      throw error;
    }
  }

  async atualizarDocumento(colecao: string, id: string, dados: any) {
    try {
      const docRef = doc(this.firestore, colecao, id);
      await updateDoc(docRef, dados);
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      throw error;
    }
  }

  async deletarDocumento(colecao: string, id: string) {
    try {
      const docRef = doc(this.firestore, colecao, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      throw error;
    }
  }
}